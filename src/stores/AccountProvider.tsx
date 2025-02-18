import React, { createContext, useContext, useState, useEffect } from 'react';
import { decryptAccountData } from '@/utils/encryption';
import { authApi } from '@/services/AuthApi';
import { accountApi } from '@/services/AccountApi';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

export interface Account {
    id: string;
    username: string;
    password: string;
    notes?: string;
    rank?: string;
    isShared?: boolean;
}

interface EncryptedAccount {
    id: string;
    encryptedData: string;
    userKey: string;
    rank?: string;
    tag?: string;
}

interface MasterKeyParams {
    masterKeyEncrypted: string;
    masterKeyIv: string;
    salt: string;
    tag: string;
}

interface JwtPayload {
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": string;
}

interface AccountContextType {
    decryptedAccounts: Account[];
    loadAccounts: (password: string) => Promise<void>;
    loadSharedAccounts: (password: string) => Promise<void>;
    isAuthenticated: boolean;
    setIsAuthenticated: (value: boolean) => void;
    currentPassword: string | null;
    setCurrentPassword: (password: string | null) => void;
    masterKeyParams: MasterKeyParams | null;
    setMasterKeyParams: (params: MasterKeyParams | null) => void;
    logout: () => void;
    getCurrentUserEmail: () => string | null;
}

const AccountContext = createContext<AccountContextType | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
    const [decryptedAccounts, setDecryptedAccounts] = useState<Account[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentPassword, setCurrentPassword] = useState<string | null>(null);
    const [masterKeyParams, setMasterKeyParamsState] = useState<MasterKeyParams | null>(null);

    const getCurrentUserEmail = (): string | null => {
        const token = Cookies.get('token');
        if (!token) return null;
        
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            return decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"];
        } catch {
            return null;
        }
    };

    const loadAccounts = async (password: string) => {
        try {
            setCurrentPassword(password);

            if (!masterKeyParams) {
                console.error('Missing master key parameters');
                return;
            }

            const response = await accountApi.getAccounts();

            if (!response.encryptedAccounts || response.encryptedAccounts.length === 0) {
                setDecryptedAccounts([]);
                return;
            }

            const accounts = await Promise.all(response.encryptedAccounts.map(async (encryptedAccount: EncryptedAccount) => {
                try {
                    if (!encryptedAccount.encryptedData || !encryptedAccount.userKey) { // !encryptedAccount.id
                        console.error('Missing required fields:', { encryptedAccount });
                        return null;
                    }

                    const decryptedData = await decryptAccountData(
                        encryptedAccount.encryptedData,
                        encryptedAccount.userKey,
                        password,
                        masterKeyParams
                    );

                    return {
                        ...decryptedData,
                        id: encryptedAccount.id,
                        rank: encryptedAccount.rank
                    } as Account;

                } catch (error) {
                    console.error('Failed to decrypt account:', error);
                    return null;
                }
            }));

            const validAccounts = accounts.filter((account): account is Account => 
                account !== null && 
                typeof account === 'object' && 
                'id' in account &&
                'username' in account && 
                'password' in account
            );

            setDecryptedAccounts(validAccounts);
        } catch (error) {
            console.error('Failed to load accounts:', error);
            throw error;
        }
    }

    const loadSharedAccounts = async (password: string) => {
        try {
            console.log("Loading shared accounts...");
            const response = await accountApi.getSharedAccounts();
            console.log("Shared accounts response:", response);

            if (!response.encryptedAccounts || response.encryptedAccounts.length === 0) {
                console.log("No shared accounts found");
                return;
            }

            const accounts = await Promise.all(response.encryptedAccounts.map(async (encryptedAccount) => {
                try {
                    console.log("Processing shared account:", encryptedAccount);
                    if (!encryptedAccount.encryptedData) {
                        console.error('Missing required fields:', { encryptedAccount });
                        return null;
                    }

                    const sharedMasterKeyParams = {
                        masterKeyEncrypted: encryptedAccount.encryptedMasterKey,
                        masterKeyIv: encryptedAccount.iv,
                        salt: encryptedAccount.salt,
                        tag: encryptedAccount.tag
                    };
                    console.log("Using shared master key params:", sharedMasterKeyParams);

                    const decryptedData = await decryptAccountData(
                        encryptedAccount.encryptedData,
                        encryptedAccount.accountIv,  // Use the account's IV instead of the master key IV
                        password,
                        sharedMasterKeyParams
                    );
                    console.log("Successfully decrypted shared account:", decryptedData);

                    return {
                        ...decryptedData,
                        isShared: true
                    } as Account;

                } catch (error) {
                    console.error('Failed to decrypt shared account:', error);
                    return null;
                }
            }));

            const validAccounts = accounts.filter((account): account is Account => 
                account !== null && 
                typeof account === 'object' && 
                'username' in account && 
                'password' in account
            );

            setDecryptedAccounts(prev => [...prev, ...validAccounts]);
        } catch (error) {
            console.error('Failed to load shared accounts:', error);
            throw error;
        }
    }

    const setMasterKeyParams = (params: MasterKeyParams | null) => {
        setMasterKeyParamsState(params);
    };

    const logout = () => {
        Cookies.remove('token');
        setCurrentPassword(null);
        setMasterKeyParams(null);
        setIsAuthenticated(false);
        setDecryptedAccounts([]);
    };

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = Cookies.get('token');
                if (!token || !currentPassword) {
                    logout();
                    return;
                }
                
                const valid = await authApi.validate();
                setIsAuthenticated(valid);
                
                if (!valid) {
                    logout();
                }
            } catch {
                logout();
            }
        };
        
        checkAuth();
    }, []);

    return (
        <AccountContext.Provider value={{ 
            decryptedAccounts, 
            loadAccounts,
            loadSharedAccounts,
            isAuthenticated, 
            setIsAuthenticated,
            currentPassword,
            setCurrentPassword,
            masterKeyParams,
            setMasterKeyParams,
            logout,
            getCurrentUserEmail
        }}>
            {children}
        </AccountContext.Provider>
    );
}

export function useAccountContext() {
    const context = useContext(AccountContext);
    if (!context) {
        throw new Error("useAccountContext must be used within an AccountProvider");
    }
    return context;
}