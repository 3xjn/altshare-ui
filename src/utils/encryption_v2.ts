import CryptoJS from 'crypto-js';

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
        const randomWordArray = CryptoJS.lib.WordArray.random(32);
        const keyBase64 = CryptoJS.enc.Base64.stringify(randomWordArray);
        
        return encrypt(keyBase64, password);
    } catch (error) {
        console.error('Error in setupUserEncryption:', error);
        throw error;
    }
}