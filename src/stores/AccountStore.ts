import { accountApi } from '@/services/AccountApi';
import { authApi } from '@/services/AuthApi';
import { groupApi } from '@/services/GroupApi';
import {
    decryptAccountData,
    decryptMasterKey,
    encryptAccountData,
    encryptExistingMasterKey
} from '@/utils/encryption';
import { arrayBufferToBase64, base64ToArrayBuffer, decryptDataToBase64, deriveEncryptionKey } from '@/utils/crypto';
import { LocalStorageStore } from '@/utils/localStorageCache';
import { create } from 'zustand';

const rankStore = new LocalStorageStore({
    storeName: 'userRanks',
    defaultTTL: 15 * 60 * 1000  // 15 minutes
});

export interface RankCache {
    rank: string;
}

export interface AccountGroup {
    id: string;
    name: string;
    usesMasterKey: boolean;
    encryptedGroupKey?: string | null;
}

export interface Account {
    id: string;
    username: string;
    password: string;
    notes?: string;
    rank?: string;
    isShared?: boolean;
    game?: string;
    gameData?: Record<string, string>;
    isLoadingRank: boolean;
    groupId?: string;
}

export interface EncryptedAccount {
    id: string;
    encryptedData: string;
    userKey: string;
}

type StoredAccountData = {
    username: string;
    password: string;
    notes?: string;
    rank?: string;
    isShared?: boolean;
    game?: string;
    gameData?: Record<string, string>;
};

const isStringRecord = (value: unknown): value is Record<string, string> => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }

    return Object.values(value).every((entry) => typeof entry === "string");
};

const parseStoredAccountData = (value: string): StoredAccountData | null => {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return null;
    }

    const record = parsed as Record<string, unknown>;
    if (
        typeof record.username !== "string" ||
        typeof record.password !== "string" ||
        record.username.length === 0 ||
        record.password.length === 0
    ) {
        return null;
    }

    if (record.notes !== undefined && typeof record.notes !== "string") {
        return null;
    }

    if (record.rank !== undefined && typeof record.rank !== "string") {
        return null;
    }

    if (record.isShared !== undefined && typeof record.isShared !== "boolean") {
        return null;
    }

    if (record.game !== undefined && typeof record.game !== "string") {
        return null;
    }

    if (record.gameData !== undefined && !isStringRecord(record.gameData)) {
        return null;
    }

    return {
        username: record.username,
        password: record.password,
        notes: typeof record.notes === "string" ? record.notes : undefined,
        rank: typeof record.rank === "string" ? record.rank : undefined,
        isShared: typeof record.isShared === "boolean" ? record.isShared : undefined,
        game: typeof record.game === "string" ? record.game : undefined,
        gameData: isStringRecord(record.gameData) ? record.gameData : undefined
    };
};

const isAccount = (value: Account | null): value is Account => value !== null;

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
        if (!currentPassword || !encryptedMasterKey) {
            console.error("Password or encryption key is null.");
            return null;
        }

        const decryptedKeyResult = await decryptMasterKey(
            encryptedMasterKey,
            currentPassword
        );
        if (!decryptedKeyResult.isUtf8Valid) {
            console.error("Failed to decrypt master key - invalid UTF-8 data");
            return null;
        }

        const decryptedKey = decryptedKeyResult.data;

        if (decryptedKeyResult.wasLegacy) {
            try {
                const updatedEncryptedKey = await encryptExistingMasterKey(
                    decryptedKey,
                    currentPassword
                );
                await authApi.updateUserSecurityProfile(updatedEncryptedKey);
                set({ encryptedMasterKey: updatedEncryptedKey });
            } catch (error) {
                console.warn("Failed to migrate encrypted master key:", error);
            }
        }

        return decryptedKey;
    };

    const loadGroups = async (): Promise<void> => {
        const masterKey = await resolveMasterKey();
        if (!masterKey) return;

        const response = await groupApi.getGroups();
        if (!Array.isArray(response)) {
            console.warn("Unexpected group response:", response);
            return;
        }
        const groupKeys: Record<string, string> = {};
        let defaultGroupId: string | null = null;

        for (const group of response) {
            if (group.usesMasterKey || !group.encryptedGroupKey) {
                groupKeys[group.id] = masterKey;
                if (group.usesMasterKey) {
                    defaultGroupId = group.id;
                }
                continue;
            }

            try {
                const decryptedResult = await decryptAccountData(
                    group.encryptedGroupKey,
                    masterKey
                );
                if (!decryptedResult.isUtf8Valid || !decryptedResult.data) {
                    console.warn(`Failed to decrypt group key for ${group.name}`);
                    continue;
                }
                groupKeys[group.id] = decryptedResult.data;
            } catch (error) {
                console.warn(`Failed to decrypt group key for ${group.name}:`, error);
            }
        }

        if (!defaultGroupId) {
            const masterGroup = response.find(group => group.usesMasterKey);
            defaultGroupId = masterGroup?.id ?? null;
        }

        set({
            groups: response,
            groupKeys,
            defaultGroupId
        });
    };

    const createGroup = async (name: string): Promise<AccountGroup | null> => {
        const masterKey = await resolveMasterKey();
        if (!masterKey) return null;

        const rawKey = crypto.getRandomValues(new Uint8Array(32));
        const groupKey = arrayBufferToBase64(rawKey.buffer);
        const encryptedGroupKey = await encryptAccountData(groupKey, masterKey);

        const group = await groupApi.createGroup({
            name,
            encryptedGroupKey
        });

        await loadGroups();
        return group;
    };

    return {
    isAuthenticated: false,
    setIsAuthenticated: (isAuthenticated) => set(() => ({
        isAuthenticated: isAuthenticated
    })),

    currentPassword: null,
    setCurrentPassword: (password) => set(() => ({
        currentPassword: password
    })),

    currentEmail: null,
    setCurrentEmail: (email) => set(() => ({
        currentEmail: email
    })),

    encryptedMasterKey: null,
    setEncryptedMasterKey: (key) => set(() => ({
        encryptedMasterKey: key
    })),

    groups: [],
    groupKeys: {},
    defaultGroupId: null,
    loadGroups: async () => {
        await loadGroups();
    },
    createGroup: async (name: string) => createGroup(name),

    decryptedAccounts: [],
    loadAccounts: async () => {
        const masterKey = await resolveMasterKey();
        if (!masterKey) return;

        if (Object.keys(get().groupKeys).length === 0) {
            await loadGroups();
        }

        const { groupKeys, defaultGroupId, currentPassword } = get();
        const response = await accountApi.getAccounts();
        if (response.length === 0) {
            set({ decryptedAccounts: [] });
            return;
        }

        try {
            const migrationTasks: Promise<void>[] = [];
            const accounts = await Promise.all(response.map(async (encryptedAccount): Promise<Account | null> => {
                if (!encryptedAccount || !encryptedAccount.encryptedData) {
                    console.warn(`Invalid encrypted account data found, skipping ${encryptedAccount.id}`);
                    return null;
                }

                const resolvedGroupId = encryptedAccount.groupId || defaultGroupId || undefined;
                const groupKey = resolvedGroupId && groupKeys[resolvedGroupId]
                    ? groupKeys[resolvedGroupId]
                    : masterKey;

                if (resolvedGroupId && !groupKeys[resolvedGroupId]) {
                    console.warn(`Missing group key for ${resolvedGroupId}, falling back to master key`);
                }

                try {
                    let decryptedResult = await decryptAccountData(
                        encryptedAccount.encryptedData,
                        groupKey,
                        currentPassword ?? undefined
                    );
                    if (!decryptedResult.isUtf8Valid) {
                        console.warn(`Account ${encryptedAccount.id} contained invalid UTF-8 data, skipping`);
                        return null;
                    }

                    if (!decryptedResult.data || decryptedResult.data.trim() === '') {
                        console.warn(`Account ${encryptedAccount.id} had empty decrypted data, skipping`);
                        return null;
                    }

                    try {
                        const parsedData = parseStoredAccountData(decryptedResult.data);
                        if (!parsedData) {
                            console.warn(`Account ${encryptedAccount.id} missing required fields, skipping`);
                            return null;
                        }

                        if (decryptedResult.wasLegacy && encryptedAccount.id) {
                            migrationTasks.push(
                                (async () => {
                                    const migrated = await encryptAccountData(
                                        decryptedResult.data,
                                        groupKey
                                    );
                                    await accountApi.editAccount(
                                        encryptedAccount.id,
                                        {
                                            encryptedData: migrated,
                                            groupId: resolvedGroupId
                                        }
                                    );
                                })()
                            );
                        }
                        return {
                            ...parsedData,
                            id: encryptedAccount.id,
                            groupId: resolvedGroupId,
                            isLoadingRank: false
                        };
                    } catch (parseError) {
                        if (currentPassword && !decryptedResult.usedFallbackPassword) {
                            decryptedResult = await decryptAccountData(
                                encryptedAccount.encryptedData,
                                groupKey,
                                currentPassword,
                                true
                            );
                            if (
                                decryptedResult.isUtf8Valid &&
                                decryptedResult.data &&
                                decryptedResult.data.trim() !== ""
                            ) {
                                try {
                                    const parsedData = parseStoredAccountData(decryptedResult.data);
                                    if (!parsedData) {
                                        console.warn(`Account ${encryptedAccount.id} missing required fields after fallback, skipping`);
                                        return null;
                                    }

                                    if (decryptedResult.wasLegacy && encryptedAccount.id) {
                                        migrationTasks.push(
                                            (async () => {
                                                const migrated = await encryptAccountData(
                                                    decryptedResult.data,
                                                    groupKey
                                                );
                                                await accountApi.editAccount(
                                                    encryptedAccount.id,
                                                    {
                                                        encryptedData: migrated,
                                                        groupId: resolvedGroupId
                                                    }
                                                );
                                            })()
                                        );
                                    }

                                    return {
                                        ...parsedData,
                                        id: encryptedAccount.id,
                                        groupId: resolvedGroupId,
                                        isLoadingRank: false
                                    };
                                } catch (fallbackParseError) {
                                    console.error(`Failed to parse JSON after fallback for account ${encryptedAccount.id}:`, fallbackParseError);
                                }
                            }
                        }

                        console.error(`Failed to parse JSON for account ${encryptedAccount.id}:`, parseError);
                        return null;
                    }
                } catch (error) {
                    console.error(`Failed to decrypt account ${encryptedAccount.id}:`, error);
                    return null;
                }
            }));

            set({
                decryptedAccounts: accounts.filter(isAccount)
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
            const response = await accountApi.getSharedAccounts();
            const groupKeyCache: Record<string, string> = {};
            const accounts = await Promise.all(response.encryptedAccounts.map(async (encryptedAccount): Promise<Account | null> => {
                if (!encryptedAccount || !encryptedAccount.encryptedData) {
                    console.warn(`Invalid shared encrypted account data found, skipping`);
                    return null;
                }

                if (!encryptedAccount.encryptedGroupKey || !encryptedAccount.iv || !encryptedAccount.salt || !encryptedAccount.tag) {
                    console.warn(`Shared account missing key material, skipping`);
                    return null;
                }
                
                try {
                    const cacheKey = encryptedAccount.groupId ?? "";
                    let sharedGroupKey = cacheKey ? groupKeyCache[cacheKey] : undefined;

                    if (!sharedGroupKey) {
                        const derivedKey = await deriveEncryptionKey(
                            password,
                            base64ToArrayBuffer(encryptedAccount.salt)
                        );
                        sharedGroupKey = await decryptDataToBase64(
                            encryptedAccount.encryptedGroupKey,
                            encryptedAccount.iv,
                            encryptedAccount.tag,
                            derivedKey
                        );
                        if (cacheKey) {
                            groupKeyCache[cacheKey] = sharedGroupKey;
                        }
                    }
                    const decryptedResult = await decryptAccountData(
                        encryptedAccount.encryptedData,
                        sharedGroupKey
                    );
                    if (!decryptedResult.isUtf8Valid) {
                        console.warn(`Shared account ${encryptedAccount.id} contained invalid UTF-8 data, skipping`);
                        return null;
                    }
                    
                    if (!decryptedResult.data || decryptedResult.data.trim() === '') {
                        console.warn(`Shared account ${encryptedAccount.id} had empty decrypted data, skipping`);
                        return null;
                    }
                    
                    try {
                        const parsedData = parseStoredAccountData(decryptedResult.data);
                        if (!parsedData) {
                            console.warn(`Shared account ${encryptedAccount.id} missing required fields, skipping`);
                            return null;
                        }
                        return { 
                            ...parsedData, 
                            id: encryptedAccount.id ?? "",
                            groupId: encryptedAccount.groupId,
                            isShared: true,
                            isLoadingRank: false 
                        };
                    } catch (parseError) {
                        console.error(`Failed to parse JSON for shared account ${encryptedAccount.id}:`, parseError);
                        return null;
                    }
                } catch (error) {
                    console.error(`Failed to decrypt shared account ${encryptedAccount.id}:`, error);
                    return null;
                }
            }));

            set((state) => ({
                decryptedAccounts: [...state.decryptedAccounts, ...accounts.filter(isAccount)]
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
                    account.game === "Marvel Rivals" &&
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
            Array.from(accountsByUsername.entries()).map(async ([username, accounts]) => {
                for (const account of accounts) {
                    updateAccount(account.id, { isLoadingRank: true });
                }

                const cache = await rankStore.get<RankCache>(username);
                if (cache) {
                    console.log("hit cache for", username, cache.rank);
                    for (const account of accounts) {
                        updateAccount(account.id, {
                            rank: cache.rank,
                            isLoadingRank: false
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
                        rank: response.rank
                    });

                    for (const account of accounts) {
                        updateAccount(account.id, {
                            rank: response.rank,
                            isLoadingRank: false
                        });
                    }
                } catch {
                    for (const account of accounts) {
                        updateAccount(account.id, { isLoadingRank: false });
                    }
                }
            })
        );
    },

    updateAccount: (id, partial) => set((state) => ({
        decryptedAccounts: state.decryptedAccounts.map(acc => {
            if (acc.id == id) {
                return {...acc, ...partial }
            }

            return acc;
        })
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
            decryptedAccounts: []
        }));
    }
    };
});
