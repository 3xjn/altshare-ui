import CryptoJS from 'crypto-js';

export interface EncryptedData {
    encryptedData: string;
    iv: string;
    salt: string;
}

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
        const key = CryptoJS.PBKDF2(password, salt, {
            keySize: 256 / 32,
            iterations: 1000
        });
        const iv = CryptoJS.lib.WordArray.random(128 / 8);
        const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
            iv: iv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        });
        
        // Combine salt, IV, and encrypted content using Base64 encoding
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

export async function decrypt(cipherText: string, password: string): Promise<string> {
    try {
        // Decode the combined Base64 data
        const combinedData = CryptoJS.enc.Base64.parse(cipherText);
        
        // Extract salt (first 16 bytes)
        const salt = CryptoJS.lib.WordArray.create(combinedData.words.slice(0, 4));
        
        // Extract IV (next 16 bytes)
        const iv = CryptoJS.lib.WordArray.create(combinedData.words.slice(4, 8));
        
        // Extract encrypted content (remaining bytes)
        const encryptedWords = combinedData.words.slice(8);
        const encrypted = CryptoJS.enc.Base64.stringify(
            CryptoJS.lib.WordArray.create(encryptedWords)
        );
        
        // Derive the key using the same salt and iterations
        const key = CryptoJS.PBKDF2(password, salt, {
            keySize: 256 / 32,
            iterations: 1000
        });
        
        // Decrypt
        const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
            iv: iv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        });
        
        return decrypted.toString(CryptoJS.enc.Utf8);
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