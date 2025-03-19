import * as _sodium from 'libsodium-wrappers-sumo';

// Basic version that just generates a random key and returns it to verify sodium is working
export async function setupUserEncryption(password: string): Promise<string> {
    try {
        // Ensure sodium is ready
        await _sodium.ready;
        
        if (!_sodium || typeof _sodium.randombytes_buf !== 'function') {
            console.error('Sodium is not properly initialized');
            throw new Error('Sodium library is not properly initialized');
        }
        
        // Log the available functions
        console.log('Sodium ready:', _sodium.ready);
        console.log('Sodium library version:', _sodium.SODIUM_LIBRARY_VERSION_MAJOR);
        console.log('Password length:', password.length); // Use password to avoid unused param warning
        
        // Generate a key
        const keyBytes = _sodium.randombytes_buf(_sodium.crypto_secretbox_KEYBYTES);
        console.log('Key generated with length:', keyBytes.length);
        
        // Convert to standard Base64 that's compatible with .NET
        // First convert Uint8Array to binary string
        let binaryString = '';
        const bytes = new Uint8Array(keyBytes);
        for (let i = 0; i < bytes.length; i++) {
            binaryString += String.fromCharCode(bytes[i]);
        }
        
        // Then use btoa to convert to Base64
        const keyBase64 = btoa(binaryString);
        console.log('Key as standard base64:', keyBase64.substring(0, 10) + '...');
        
        return keyBase64;
    } catch (error) {
        console.error('Error in setupUserEncryption:', error);
        throw error;
    }
}

// Placeholder implementations for encrypt/decrypt - not actually used in the initial test
export async function encrypt(plaintext: string, password: string): Promise<string> {
    console.log('Encrypt called with password length:', password.length);
    return plaintext;  // Placeholder
}

export async function decrypt(cipherText: string, password: string): Promise<string> {
    console.log('Decrypt called with password length:', password.length);
    return cipherText;  // Placeholder
}