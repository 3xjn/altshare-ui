import { accountApi } from '@/services/AccountApi';
import { authApi } from '@/services/AuthApi';
import {
    decryptAccountData,
    decryptMasterKey,
    encryptAccountData,
    encryptExistingMasterKey
} from '@/utils/encryption';
import { base64ToArrayBuffer, decryptDataToBase64, deriveEncryptionKey } from '@/utils/crypto';
import { LocalStorageStore } from '@/utils/localStorageCache';
import { create } from 'zustand';

const rankStore = new LocalStorageStore({
    storeName: 'userRanks',
    defaultTTL: 15 * 60 * 1000  // 15 minutes
});

export interface RankCache {
    rank: string;
}

export interface Account {
    id: string;
    username: string;
    password: string;
    notes?: string;
    rank?: string;
    isShared?: boolean;
    game?: "Marvel Rivals";
    isLoadingRank: boolean;
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

    decryptedAccounts: Account[];
    loadAccounts: () => Promise<void>;
    loadSharedAccounts: () => Promise<void>;
    getRanks: () => Promise<void>;

    updateAccount: (username: string, account: Partial<Account>) => void;

    logout: () => void;
}

export const useAccountStore = create<AccountContextType>((set) => ({
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

    decryptedAccounts: [],
    loadAccounts: async () => {
        const password = useAccountStore.getState().currentPassword;
        const encryptedKey = useAccountStore.getState().encryptedMasterKey;

        if (!password || !encryptedKey) return console.error("Password or encryption key is null.");

        const decryptedKeyResult = await decryptMasterKey(encryptedKey, password);
        if (!decryptedKeyResult.isUtf8Valid) {
            console.error("Failed to decrypt master key - invalid UTF-8 data");
            return;
        }
        const decryptedKey = decryptedKeyResult.data;

        if (decryptedKeyResult.wasLegacy) {
            try {
                const updatedEncryptedKey = await encryptExistingMasterKey(
                    decryptedKey,
                    password
                );
                await authApi.updateUserSecurityProfile(updatedEncryptedKey);
                set({ encryptedMasterKey: updatedEncryptedKey });
            } catch (error) {
                console.warn("Failed to migrate encrypted master key:", error);
            }
        }

        const response = await accountApi.getAccounts();
        if (response.length === 0) return;

        try {
            const migrationTasks: Promise<void>[] = [];
            const accounts: Account[] = await Promise.all(response.map(async (encryptedAccount) => {
                if (!encryptedAccount || !encryptedAccount.encryptedData) {
                    console.warn(`Invalid encrypted account data found, skipping ${encryptedAccount.id}`);
                    return null;
                }
                
                try {
                    let decryptedResult = await decryptAccountData(
                        encryptedAccount.encryptedData,
                        decryptedKey,
                        password
                    );
                    if (!decryptedResult.isUtf8Valid) {
                        console.warn(`Account ${encryptedAccount.id} contained invalid UTF-8 data, skipping`);
                        return null;
                    }
                    
                    if (!decryptedResult.data || decryptedResult.data.trim() === '') {
                        console.warn(`Account ${encryptedAccount.id} had empty decrypted data, skipping`);
                        return null;
                    }
                    
                    let parsedData: Account | null = null;
                    try {
                        parsedData = JSON.parse(decryptedResult.data);
                        if (!parsedData.username || !parsedData.password) {
                            console.warn(`Account ${encryptedAccount.id} missing required fields, skipping`);
                            return null;
                        }

                        if (
                            decryptedResult.wasLegacy &&
                            encryptedAccount.id
                        ) {
                            migrationTasks.push(
                                (async () => {
                                    const migrated = await encryptAccountData(
                                        decryptedResult.data,
                                        decryptedKey
                                    );
                                    await accountApi.editAccount(
                                        encryptedAccount.id,
                                        { encryptedData: migrated }
                                    );
                                })()
                            );
                        }
                        return { 
                            ...parsedData, 
                            id: encryptedAccount.id,
                            isLoadingRank: false 
                        };
                    } catch (parseError) {
                        if (password && !decryptedResult.usedFallbackPassword) {
                            decryptedResult = await decryptAccountData(
                                encryptedAccount.encryptedData,
                                decryptedKey,
                                password,
                                true
                            );
                            if (
                                decryptedResult.isUtf8Valid &&
                                decryptedResult.data &&
                                decryptedResult.data.trim() !== ""
                            ) {
                                try {
                                    parsedData = JSON.parse(decryptedResult.data);
                                    if (!parsedData.username || !parsedData.password) {
                                        console.warn(`Account ${encryptedAccount.id} missing required fields after fallback, skipping`);
                                        return null;
                                    }

                                    if (
                                        decryptedResult.wasLegacy &&
                                        encryptedAccount.id
                                    ) {
                                        migrationTasks.push(
                                            (async () => {
                                                const migrated = await encryptAccountData(
                                                    decryptedResult.data,
                                                    decryptedKey
                                                );
                                                await accountApi.editAccount(
                                                    encryptedAccount.id,
                                                    { encryptedData: migrated }
                                                );
                                            })()
                                        );
                                    }

                                    return {
                                        ...parsedData,
                                        id: encryptedAccount.id,
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
                decryptedAccounts: accounts.filter(Boolean) as Account[]
            });

            if (migrationTasks.length > 0) {
                await Promise.allSettled(migrationTasks);
            }
        } catch (error) {
            console.error("Failed to load accounts:", error);
        }
    },
    loadSharedAccounts: async () => {
        const password = useAccountStore.getState().currentPassword;
        if (!password) return console.error("Password is null.");

        try {
            const response = await accountApi.getSharedAccounts();
            const accounts: Account[] = await Promise.all(response.encryptedAccounts.map(async (encryptedAccount) => {
                if (!encryptedAccount || !encryptedAccount.encryptedData) {
                    console.warn(`Invalid shared encrypted account data found, skipping`);
                    return null;
                }

                if (!encryptedAccount.encryptedMasterKey || !encryptedAccount.iv || !encryptedAccount.salt || !encryptedAccount.tag) {
                    console.warn(`Shared account missing key material, skipping`);
                    return null;
                }
                
                try {
                    const derivedKey = await deriveEncryptionKey(
                        password,
                        base64ToArrayBuffer(encryptedAccount.salt)
                    );
                    const sharedMasterKey = await decryptDataToBase64(
                        encryptedAccount.encryptedMasterKey,
                        encryptedAccount.iv,
                        encryptedAccount.tag,
                        derivedKey
                    );
                    const decryptedResult = await decryptAccountData(
                        encryptedAccount.encryptedData,
                        sharedMasterKey
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
                        const parsedData = JSON.parse(decryptedResult.data);
                        if (!parsedData.username || !parsedData.password) {
                            console.warn(`Shared account ${encryptedAccount.id} missing required fields, skipping`);
                            return null;
                        }
                        return { 
                            ...parsedData, 
                            id: encryptedAccount.id ?? "",
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
                decryptedAccounts: [...state.decryptedAccounts, ...accounts.filter(Boolean) as Account[]]
            }));
        } catch (error) {
            console.error("Failed to load shared accounts:", error);
        }
    },
    getRanks: async () => {
        const updateAccount = useAccountStore.getState().updateAccount;

        await Promise.all(useAccountStore.getState().decryptedAccounts.map(async account => {
            if (account.game == "Marvel Rivals") {
                updateAccount(account.username, { isLoadingRank: true })

                const cache = await rankStore.get<RankCache>(account.username)
                if (cache) {
                    console.log("hit cache for", account.username, cache.rank)
                    updateAccount(account.username, { rank: cache.rank, isLoadingRank: false })
                    return;
                };

                const response = await accountApi.getRank(account.username);
                console.log("response", response)
                
                try {
                    if (response) {
                        if (response.rank == "Invalid level") throw new Error("Invalid level");

                        rankStore.set<RankCache>(account.username, {
                            rank: response.rank
                        });
                        updateAccount(account.username, { rank: response.rank, isLoadingRank: false });
                    }
                } catch {
                    updateAccount(account.username, { isLoadingRank: false })
                }
            }
        }));
    },

    updateAccount: (username, partial) => set((state) => ({
        decryptedAccounts: state.decryptedAccounts.map(acc => {
            if (acc.username == username) {
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
            decryptedAccounts: []
        }));
    }
}))
