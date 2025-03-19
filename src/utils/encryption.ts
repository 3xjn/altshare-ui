import { AccountData } from '@/models/SharedAccount';
import { arrayBufferToBase64, base64ToArrayBuffer } from './crypto';

interface MasterKeyParams {
    masterKeyEncrypted: string;
    masterKeyIv: string;
    salt: string;
    tag: string;
}

export async function encryptAccountData(
    accountData: AccountData, 
    password: string,
    masterKeyParams: MasterKeyParams
) {
    console.log(masterKeyParams);

    const masterKey = await decryptMasterKey(
        masterKeyParams.masterKeyEncrypted,
        masterKeyParams.masterKeyIv,
        masterKeyParams.salt,
        masterKeyParams.tag,
        password
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, tagLength: 128 },
        masterKey,
        encoder.encode(JSON.stringify([accountData]))
    );

    // The encrypted result already includes the tag at the end
    return {
        encryptedData: arrayBufferToBase64(encrypted),
        userKey: arrayBufferToBase64(iv.buffer)
    };
}

export async function decryptAccountData(
    encryptedData: string,
    userKey: string,
    password: string,
    masterKeyParams: MasterKeyParams
): Promise<AccountData> {
    try {
        const masterKey = await decryptMasterKey(
            masterKeyParams.masterKeyEncrypted,
            masterKeyParams.masterKeyIv,
            masterKeyParams.salt,
            masterKeyParams.tag,
            password
        );

        const decrypted = await decryptWithMasterKey(encryptedData, userKey, masterKey);
        return JSON.parse(decrypted)[0];
    } catch (error) {
        console.error('Decryption failed:', error);
        throw error;
    }
}

export async function decryptMasterKey(
    encryptedMasterKey: string,
    iv: string,
    salt: string,
    tag: string | undefined | null,
    password: string
): Promise<CryptoKey> {
    try {
        // Convert base64 strings to bytes
        const encryptedBytes = base64ToArrayBuffer(encryptedMasterKey);
        const ivBytes = base64ToArrayBuffer(iv);
        const saltBytes = base64ToArrayBuffer(salt);
        
        // Handle missing or empty tag
        let combinedCiphertext: Uint8Array;
        if (!tag) {
            // If no tag, assume the encryptedMasterKey already includes the tag
            combinedCiphertext = new Uint8Array(encryptedBytes);
        } else {
            const tagBytes = base64ToArrayBuffer(tag);
            // Validate lengths
            if (tagBytes.byteLength !== 16) throw new Error(`Invalid tag length: ${tagBytes.byteLength}`);
            
            // Create combined ciphertext + tag buffer
            combinedCiphertext = new Uint8Array(encryptedBytes.byteLength + tagBytes.byteLength);
            combinedCiphertext.set(new Uint8Array(encryptedBytes), 0);
            combinedCiphertext.set(new Uint8Array(tagBytes), encryptedBytes.byteLength);
        }

        // Validate other lengths
        if (ivBytes.byteLength !== 12) throw new Error(`Invalid IV length: ${ivBytes.byteLength}`);
        if (saltBytes.byteLength !== 16) throw new Error(`Invalid salt length: ${saltBytes.byteLength}`);

        // Derive key from password
        const encoder = new TextEncoder();
        const passwordKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        const derivedKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBytes,
                iterations: 100000,
                hash: 'SHA-256'
            },
            passwordKey,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );

        // Decrypt master key
        const decryptedKeyData = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: ivBytes,
                tagLength: 128
            },
            derivedKey,
            combinedCiphertext
        );

        // Import decrypted key
        return crypto.subtle.importKey(
            'raw',
            decryptedKeyData,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    } catch (error) {
        console.error('Master key decryption failed:', {
            error,
            encryptedMasterKey,
            iv,
            salt,
            tag
        });
        throw error;
    }
}

export async function decryptWithMasterKey(
    encryptedData: string,
    iv: string,
    masterKey: CryptoKey
): Promise<string> {
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToArrayBuffer(iv), tagLength: 128 },
        masterKey,
        base64ToArrayBuffer(encryptedData)
    );

    return new TextDecoder().decode(decrypted);
}