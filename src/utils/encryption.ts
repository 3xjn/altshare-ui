import CryptoJS from 'crypto-js';

export interface EncryptedData {
    encryptedData: string;
    iv: string;
    salt: string;
}

export interface DecryptionResult {
    data: string;
    isUtf8Valid: boolean;
}

// Format version flag to distinguish between encryption methods
const ENCRYPTION_VERSION = 1; // Version 1 = UTF-8 encoding of both password and plaintext

// Convert string to base64
export const toBase64 = (str: string): string => {
    return CryptoJS.enc.Utf8.parse(str).toString(CryptoJS.enc.Base64);
};

// Convert base64 to string
export const fromBase64 = (str: string): string => {
    return CryptoJS.enc.Base64.parse(str).toString(CryptoJS.enc.Utf8);
};

// Generate a random IV
export const generateIV = (): string => {
    return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Base64);
};

// Generate a random salt
export const generateSalt = (): string => {
    return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Base64);
};

export async function encrypt(plaintext: string, password: string): Promise<string> {
    try {
        const salt = CryptoJS.lib.WordArray.random(128 / 8);
        // Parse password as UTF-8
        const passwordUtf8 = CryptoJS.enc.Utf8.parse(password);
        const key = CryptoJS.PBKDF2(passwordUtf8, salt, {
            keySize: 256 / 32,
            iterations: 1000
        });
        const iv = CryptoJS.lib.WordArray.random(128 / 8);
        
        // Always ensure plaintext is properly UTF-8 encoded for consistency
        const plaintextUtf8 = CryptoJS.enc.Utf8.parse(plaintext);
        
        const encrypted = CryptoJS.AES.encrypt(plaintextUtf8, key, {
            iv: iv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        });
        
        // We'll use the legacy format (without version flag) for better compatibility
        // Until all accounts are migrated
        const combinedData = CryptoJS.enc.Base64.stringify(
            CryptoJS.lib.WordArray.create([
                ...salt.words,
                ...iv.words,
                ...CryptoJS.enc.Base64.parse(encrypted.toString()).words
            ])
        );
        
        return combinedData;
    } catch (error) {
        console.error('Error encrypting:', error);
        throw error;
    }
}

export async function decrypt(cipherText: string, password: string): Promise<DecryptionResult> {
    try {
        // Decode the combined Base64 data
        const combinedData = CryptoJS.enc.Base64.parse(cipherText);
        
        // Check if we have a version flag (version 1+)
        // If first word is ENCRYPTION_VERSION, it's a versioned format
        const hasVersion = combinedData.words.length > 0 && combinedData.words[0] === ENCRYPTION_VERSION;
        
        let salt, iv, encryptedWords;
        
        if (hasVersion) {
            // Version 1 format: [version(1), salt(4), iv(4), encrypted(rest)]
            salt = CryptoJS.lib.WordArray.create(combinedData.words.slice(1, 5));
            iv = CryptoJS.lib.WordArray.create(combinedData.words.slice(5, 9));
            encryptedWords = combinedData.words.slice(9);
        } else {
            // Legacy format: [salt(4), iv(4), encrypted(rest)]
            salt = CryptoJS.lib.WordArray.create(combinedData.words.slice(0, 4));
            iv = CryptoJS.lib.WordArray.create(combinedData.words.slice(4, 8));
            encryptedWords = combinedData.words.slice(8);
        }
        
        const encrypted = CryptoJS.enc.Base64.stringify(
            CryptoJS.lib.WordArray.create(encryptedWords)
        );
        
        // First try with UTF-8 parsed password
        try {
            const key = CryptoJS.PBKDF2(CryptoJS.enc.Utf8.parse(password), salt, {
                keySize: 256 / 32,
                iterations: 1000
            });
            
            const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
                iv: iv,
                padding: CryptoJS.pad.Pkcs7,
                mode: CryptoJS.mode.CBC
            });
            
            try {
                // Try to convert to UTF-8 string
                const utf8Data = decrypted.toString(CryptoJS.enc.Utf8);
                return { data: utf8Data, isUtf8Valid: true };
            } catch (_) {
                // If UTF-8 conversion fails, return as Base64
                console.warn('UTF-8 conversion failed, returning as Base64');
                return { 
                    data: decrypted.toString(CryptoJS.enc.Base64), 
                    isUtf8Valid: false 
                };
            }
        } catch (_) {
            // If first try fails, fall back to raw password
            try {
                const key = CryptoJS.PBKDF2(password, salt, {
                    keySize: 256 / 32,
                    iterations: 1000
                });
                
                const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
                    iv: iv,
                    padding: CryptoJS.pad.Pkcs7,
                    mode: CryptoJS.mode.CBC
                });
                
                try {
                    // Try to convert to UTF-8 string
                    const utf8Data = decrypted.toString(CryptoJS.enc.Utf8);
                    return { data: utf8Data, isUtf8Valid: true };
                } catch (_) {
                    // If UTF-8 conversion fails, return as Base64
                    console.warn('UTF-8 conversion failed in fallback, returning as Base64');
                    return { 
                        data: decrypted.toString(CryptoJS.enc.Base64), 
                        isUtf8Valid: false 
                    };
                }
            } catch (_) {
                console.error('Both decryption methods failed');
                return { data: "", isUtf8Valid: false };
            }
        }
    } catch (error) {
        console.error('Error decrypting:', error);
        throw error;
    }
}

export async function setupUserEncryption(password: string): Promise<string> {
    try {
        // Generate a random key (256 bits = 32 bytes)
        const randomKey = CryptoJS.lib.WordArray.random(32);
        const keyBase64 = randomKey.toString(CryptoJS.enc.Base64);
        
        return encrypt(keyBase64, password);
    } catch (error) {
        console.error('Error in setupUserEncryption:', error);
        throw error;
    }
}

export async function encryptPassword(password: string): Promise<string> {
    try {
        const hash = CryptoJS.SHA256(password);
        return hash.toString(CryptoJS.enc.Base64);
    } catch (error) {
        console.error('Error encrypting password:', error);
        throw error;
    }
}

export async function encryptExistingMasterKey(base64Key: string, password: string): Promise<string> {
    try {
        return encrypt(base64Key, password);
    } catch (error) {
        console.error('Error encrypting existing master key:', error);
        throw error;
    }
}

export async function encryptAccountData(data: string, masterKey: string): Promise<string> {
    try {
        return encrypt(data, masterKey);
    } catch (error) {
        console.error('Error encrypting account data:', error);
        throw error;
    }
}