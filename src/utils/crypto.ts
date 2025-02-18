import { Buffer } from 'buffer';

export interface EncryptedData {
    encryptedData: string;
    iv: string;
}

// Convert string to base64
export const toBase64 = (str: string): string => {
    return Buffer.from(str).toString('base64');
};

// Convert base64 to string
export const fromBase64 = (str: string): string => {
    return Buffer.from(str, 'base64').toString();
};

// Generate a random IV
export const generateIV = (): ArrayBuffer => {
    return crypto.getRandomValues(new Uint8Array(12)).buffer;
};

// Convert ArrayBuffer to base64 string
export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    return Buffer.from(buffer).toString('base64');
};

// Convert base64 string to ArrayBuffer (updated implementation)
export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = Buffer.from(base64, 'base64').toString('binary');
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

// Encrypt data using AES-GCM
export async function encryptData(data: string, key: CryptoKey): Promise<EncryptedData & { tag: string }> {
    const iv = generateIV();
    const encodedData = new TextEncoder().encode(data);

    const encryptedBuffer = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv,
            tagLength: 128
        },
        key,
        encodedData
    );

    // Split the result into ciphertext and tag
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const tagLength = 16; // 128 bits = 16 bytes
    const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - tagLength);
    const tag = encryptedBytes.slice(encryptedBytes.length - tagLength);

    return {
        encryptedData: arrayBufferToBase64(ciphertext),
        iv: arrayBufferToBase64(iv),
        tag: arrayBufferToBase64(tag)
    };
}

// Decrypt data using AES-GCM
export async function decryptData(encryptedData: string, iv: string, tag: string, key: CryptoKey): Promise<string> {
    // Combine ciphertext and tag
    const ciphertextBytes = base64ToArrayBuffer(encryptedData);
    const tagBytes = base64ToArrayBuffer(tag);
    const combinedBytes = new Uint8Array(ciphertextBytes.byteLength + tagBytes.byteLength);
    combinedBytes.set(new Uint8Array(ciphertextBytes), 0);
    combinedBytes.set(new Uint8Array(tagBytes), ciphertextBytes.byteLength);

    const decryptedBuffer = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: base64ToArrayBuffer(iv),
            tagLength: 128
        },
        key,
        combinedBytes
    );

    return new TextDecoder().decode(decryptedBuffer);
}

// Derive key from password using PBKDF2
export async function deriveEncryptionKey(
    password: string,
    salt: ArrayBuffer,
    iterations: number = 100000
): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations,
            hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

// Generate a random master key
export async function generateMasterKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256
        },
        true,
        ['encrypt', 'decrypt']
    );
}

// Export master key to base64 string
export async function exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return arrayBufferToBase64(exported);
}

// Import master key from base64 string and decrypt it with derived key
export async function importKey(encryptedKeyData: { data: string, iv: string, tag: string }, derivedKey: CryptoKey): Promise<CryptoKey> {
    const decryptedKeyData = await decryptData(encryptedKeyData.data, encryptedKeyData.iv, encryptedKeyData.tag, derivedKey);
    const keyBuffer = base64ToArrayBuffer(decryptedKeyData);
    return crypto.subtle.importKey(
        'raw',
        keyBuffer,
        'AES-GCM',
        true,
        ['encrypt', 'decrypt']
    );
}

export async function setupUserEncryption(password: string) {
    // 1. Generate random salt (16 bytes)
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // 2. Derive key using PBKDF2
    const derivedKey = await deriveEncryptionKey(password, salt);
    
    // 3. Generate and encrypt master key
    const masterKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const rawMasterKey = await crypto.subtle.exportKey('raw', masterKey);
    
    // Encrypt with GCM and get both ciphertext and tag
    const encryptedResult = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: 128 },
        derivedKey,
        rawMasterKey
    );

    // Split the result into ciphertext and tag
    const encryptedBytes = new Uint8Array(encryptedResult);
    const tagLength = 16; // 128 bits = 16 bytes
    const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - tagLength);
    const tag = encryptedBytes.slice(encryptedBytes.length - tagLength);

    return {
        masterKey,
        securityParams: {
            encryptedMasterKey: arrayBufferToBase64(ciphertext),
            iv: arrayBufferToBase64(iv),
            salt: arrayBufferToBase64(salt),
            tag: arrayBufferToBase64(tag)
        }
    };
}

export async function encryptPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const encrypted = await crypto.subtle.digest('SHA-256', data);
    return arrayBufferToBase64(encrypted);
}

export async function decryptPassword(encrypted: string): Promise<string> {
    // Implement your decryption logic here
    // This is just a placeholder example
    const buffer = base64ToArrayBuffer(encrypted);
    return new TextDecoder().decode(buffer);
}

export async function encryptExistingMasterKey(base64Key: string, password: string) {
    // Generate random salt (16 bytes) for key derivation
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Derive key from password using PBKDF2
    const derivedKey = await deriveEncryptionKey(password, salt);
    
    // Convert the base64 key back to raw format
    const rawMasterKey = base64ToArrayBuffer(base64Key);
    
    // Generate random IV for encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt with GCM and get both ciphertext and tag
    const encryptedResult = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: 128 },
        derivedKey,
        rawMasterKey
    );

    // Split the result into ciphertext and tag
    const encryptedBytes = new Uint8Array(encryptedResult);
    const tagLength = 16; // 128 bits = 16 bytes
    const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - tagLength);
    const tag = encryptedBytes.slice(encryptedBytes.length - tagLength);

    return {
        encryptedMasterKey: arrayBufferToBase64(ciphertext),
        iv: arrayBufferToBase64(iv),
        salt: arrayBufferToBase64(salt),
        tag: arrayBufferToBase64(tag)
    };
} 