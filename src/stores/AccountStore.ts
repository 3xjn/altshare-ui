import { accountApi } from '@/services/AccountApi';
import { decrypt } from '@/utils/encryption_v2';
import { create } from 'zustand';

export interface Account {
    id: string;
    username: string;
    password: string;
    notes?: string;
    rank?: string;
    isShared?: boolean;
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
            console.log(decryptedJson)
            return JSON.parse(decryptedJson) ?? null;
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
            return JSON.parse(decryptedJson) ?? null;
        }))

        set((state) => ({
            decryptedAccounts: [...state.decryptedAccounts, ...accounts]
        }));
    },

    logout: () => set(() => ({
        isAuthenticated: false,
        currentPassword: null,
        decryptedAccounts: []
    }))
}))