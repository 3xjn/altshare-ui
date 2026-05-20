import { accountApi } from "@/services/AccountApi";
import { authApi } from "@/services/AuthApi";
import { groupApi } from "@/services/GroupApi";
import { supportsRankTracking } from "@/config/games";
import { loadGroupsWithMasterKey } from "@/stores/accountStore/groups";
import { loadOwnedAccounts } from "@/stores/accountStore/loadOwnedAccounts";
import { loadSharedAccountsForPassword } from "@/stores/accountStore/loadSharedAccounts";
import { resolveMasterKey as resolveDecryptedMasterKey } from "@/stores/accountStore/masterKey";
import type { Account, AccountGroup } from "@/types/account";
import { encryptAccountData } from "@/utils/encryption";
import { arrayBufferToBase64 } from "@/utils/crypto";
import { LocalStorageStore } from "@/utils/localStorageCache";
import { create } from "zustand";

const rankStore = new LocalStorageStore({
    storeName: "userRanks",
    defaultTTL: 15 * 60 * 1000, // 15 minutes
});

export interface RankCache {
    rank: string;
}

export interface EncryptedAccount {
    id: string;
    encryptedData: string;
    userKey: string;
}

interface AccountContextType {
    isAuthenticated: boolean;
    setIsAuthenticated: (value: boolean) => void;

    currentPassword: string | null;
    setCurrentPassword: (password: string) => void;

    currentEmail: string | null;
    setCurrentEmail: (email: string) => void;

    encryptedMasterKey: string | null;
    setEncryptedMasterKey: (key: string) => void;

    groups: AccountGroup[];
    groupKeys: Record<string, string>;
    defaultGroupId: string | null;
    loadGroups: () => Promise<void>;
    createGroup: (name: string) => Promise<AccountGroup | null>;
    renameGroup: (id: string, name: string) => Promise<AccountGroup | null>;
    deleteGroup: (id: string) => Promise<boolean>;

    decryptedAccounts: Account[];
    loadAccounts: () => Promise<void>;
    loadSharedAccounts: () => Promise<void>;
    getRanks: () => Promise<void>;

    updateAccount: (id: string, account: Partial<Account>) => void;

    logout: () => void;
}

export const useAccountStore = create<AccountContextType>((set, get) => {
    const resolveMasterKey = async (): Promise<string | null> => {
        const { currentPassword, encryptedMasterKey } = get();

        return resolveDecryptedMasterKey({
            currentPassword,
            encryptedMasterKey,
            setEncryptedMasterKey: (value: string) => {
                set({ encryptedMasterKey: value });
            },
        });
    };

    const loadGroups = async (): Promise<void> => {
        const masterKey = await resolveMasterKey();
        if (!masterKey) return;

        const groupsState = await loadGroupsWithMasterKey(masterKey);
        if (!groupsState) {
            return;
        }

        set(groupsState);
    };

    const createGroup = async (name: string): Promise<AccountGroup | null> => {
        const masterKey = await resolveMasterKey();
        if (!masterKey) return null;

        const rawKey = crypto.getRandomValues(new Uint8Array(32));
        const groupKey = arrayBufferToBase64(rawKey.buffer);
        const encryptedGroupKey = await encryptAccountData(groupKey, masterKey);

        const group = await groupApi.createGroup({
            name,
            encryptedGroupKey,
        });

        await loadGroups();
        return group;
    };

    const renameGroup = async (id: string, name: string): Promise<AccountGroup | null> => {
        const group = await groupApi.renameGroup(id, { name });
        await loadGroups();
        return group;
    };

    const deleteGroup = async (id: string): Promise<boolean> => {
        await groupApi.deleteGroup(id);
        await loadGroups();
        return true;
    };

    return {
        isAuthenticated: false,
        setIsAuthenticated: (isAuthenticated) =>
            set(() => ({
                isAuthenticated: isAuthenticated,
            })),

        currentPassword: null,
        setCurrentPassword: (password) =>
            set(() => ({
                currentPassword: password,
            })),

        currentEmail: null,
        setCurrentEmail: (email) =>
            set(() => ({
                currentEmail: email,
            })),

        encryptedMasterKey: null,
        setEncryptedMasterKey: (key) =>
            set(() => ({
                encryptedMasterKey: key,
            })),

        groups: [],
        groupKeys: {},
        defaultGroupId: null,
        loadGroups: async () => {
            await loadGroups();
        },
        createGroup: async (name: string) => createGroup(name),
        renameGroup: async (id: string, name: string) => renameGroup(id, name),
        deleteGroup: async (id: string) => deleteGroup(id),

        decryptedAccounts: [],
        loadAccounts: async () => {
            const masterKey = await resolveMasterKey();
            if (!masterKey) return;

            if (Object.keys(get().groupKeys).length === 0) {
                await loadGroups();
            }

            const { groupKeys, defaultGroupId, currentPassword } = get();

            try {
                const { accounts, migrationTasks } = await loadOwnedAccounts({
                    masterKey,
                    groupKeys,
                    defaultGroupId,
                    currentPassword,
                });

                set({
                    decryptedAccounts: accounts,
                });

                if (migrationTasks.length > 0) {
                    await Promise.allSettled(migrationTasks);
                }
            } catch (error) {
                console.error("Failed to load accounts:", error);
            }
        },
        loadSharedAccounts: async () => {
            const password = get().currentPassword;
            if (!password) return console.error("Password is null.");

            try {
                const accounts = await loadSharedAccountsForPassword(password);

                set((state) => ({
                    decryptedAccounts: [...state.decryptedAccounts, ...accounts],
                }));
            } catch (error) {
                console.error("Failed to load shared accounts:", error);
            }
        },
        getRanks: async () => {
            const updateAccount = useAccountStore.getState().updateAccount;
            const marvelAccounts = useAccountStore
                .getState()
                .decryptedAccounts.filter(
                    (account) =>
                        supportsRankTracking(account.game) &&
                        account.id &&
                        account.username
                );

            const accountsByUsername = new Map<string, Account[]>();
            for (const account of marvelAccounts) {
                const existing = accountsByUsername.get(account.username) ?? [];
                existing.push(account);
                accountsByUsername.set(account.username, existing);
            }

            await Promise.all(
                Array.from(accountsByUsername.entries()).map(
                    async ([username, accounts]) => {
                        for (const account of accounts) {
                            updateAccount(account.id, { isLoadingRank: true });
                        }

                        const cache = await rankStore.get<RankCache>(username);
                        if (cache) {
                            console.log("hit cache for", username, cache.rank);
                            for (const account of accounts) {
                                updateAccount(account.id, {
                                    rank: cache.rank,
                                    isLoadingRank: false,
                                });
                            }
                            return;
                        }

                        try {
                            const response = await accountApi.getRank(username);
                            console.log("response", response);

                            if (!response?.rank || response.rank === "Invalid level") {
                                throw new Error("Invalid level");
                            }

                            await rankStore.set<RankCache>(username, {
                                rank: response.rank,
                            });

                            for (const account of accounts) {
                                updateAccount(account.id, {
                                    rank: response.rank,
                                    isLoadingRank: false,
                                });
                            }
                        } catch {
                            for (const account of accounts) {
                                updateAccount(account.id, { isLoadingRank: false });
                            }
                        }
                    }
                )
            );
        },

        updateAccount: (id, partial) =>
            set((state) => ({
                decryptedAccounts: state.decryptedAccounts.map((acc) => {
                    if (acc.id == id) {
                        return { ...acc, ...partial };
                    }

                    return acc;
                }),
            })),

        logout: () => {
            authApi.logout().catch((error) => {
                console.warn("Failed to logout:", error);
            });
            set(() => ({
                isAuthenticated: false,
                currentPassword: null,
                currentEmail: null,
                encryptedMasterKey: null,
                groups: [],
                groupKeys: {},
                defaultGroupId: null,
                decryptedAccounts: [],
            }));
        },
    };
});
