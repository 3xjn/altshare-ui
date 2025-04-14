import { accountApi } from '@/services/AccountApi';
import { decrypt } from '@/utils/encryption';
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

    encryptedMasterKey: null,
    setEncryptedMasterKey: (key) => set(() => ({
        encryptedMasterKey: key
    })),

    decryptedAccounts: [],
    loadAccounts: async () => {
        const password = useAccountStore.getState().currentPassword;
        const encryptedKey = useAccountStore.getState().encryptedMasterKey;

        if (!password || !encryptedKey) return console.error("Password or encryption key is null.");

        const decryptedKey = await decrypt(encryptedKey, password);
        console.log(decryptedKey)

        const response = await accountApi.getAccounts();
        if (response.length === 0) return;

        const accounts: Account[] = await Promise.all(response.map(async (encryptedAccount) => {
            const decryptedJson = await decrypt(encryptedAccount.encryptedData, decryptedKey);
            return JSON.parse(decryptedJson) ?? [];
        }))

        set({
            decryptedAccounts: accounts
        });
    },
    loadSharedAccounts: async () => {
        const password = useAccountStore.getState().currentPassword;
        const encryptedKey = useAccountStore.getState().encryptedMasterKey;

        if (!password || !encryptedKey) return console.error("Password or encryption key is null.");

        const decryptedKey = await decrypt(encryptedKey, password);

        const response = await accountApi.getSharedAccounts();
        const accounts: Account[] = await Promise.all(response.encryptedAccounts.map(async (encryptedAccount) => {
            const decryptedJson = await decrypt(encryptedAccount.encryptedData, decryptedKey);
            return JSON.parse(decryptedJson) ?? [];
        }))

        set((state) => ({
            decryptedAccounts: [...state.decryptedAccounts, ...accounts]
        }));
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

    logout: () => set(() => ({
        isAuthenticated: false,
        currentPassword: null,
        decryptedAccounts: []
    }))
}))