import CryptoJS from "crypto-js";
import { Buffer } from "buffer";

export interface DecryptionResult {
    data: string;
    isUtf8Valid: boolean;
    wasLegacy?: boolean;
    usedFallbackPassword?: boolean;
}

type EnvelopeV2 = {
    v: 2;
    alg: "AES-GCM";
    kdf: "PBKDF2" | "NONE";
    iter?: number;
    salt?: string;
    iv: string;
    ct: string;
    tag: string;
};

const MAGIC = "AS2:";
const PBKDF2_ITERATIONS = 200000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const TAG_BYTES = 16;

const toBase64 = (bytes: Uint8Array): string =>
    Buffer.from(bytes).toString("base64");

const fromBase64 = (base64: string): Uint8Array =>
    new Uint8Array(Buffer.from(base64, "base64"));

const encodeEnvelope = (payload: EnvelopeV2): string => {
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(MAGIC + json);
    return Buffer.from(bytes).toString("base64");
};

const decodeEnvelope = (value: string): EnvelopeV2 | null => {
    try {
        const bytes = Buffer.from(value, "base64");
        const text = new TextDecoder().decode(bytes);
        if (!text.startsWith(MAGIC)) return null;
        const payload = JSON.parse(text.slice(MAGIC.length)) as EnvelopeV2;
        if (!payload || payload.v !== 2 || payload.alg !== "AES-GCM") {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
};

const decodeUtf8 = (bytes: Uint8Array): DecryptionResult => {
    try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        return { data: text, isUtf8Valid: true };
    } catch {
        const text = new TextDecoder("utf-8").decode(bytes);
        return { data: text, isUtf8Valid: false };
    }
};

const deriveKeyFromPassword = async (
    password: string,
    salt: Uint8Array,
    iterations: number
): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations,
            hash: "SHA-256",
        },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
};

const encryptAesGcm = async (
    plaintext: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array
): Promise<{ ct: Uint8Array; tag: Uint8Array }> => {
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, tagLength: 128 },
        key,
        plaintext
    );
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const tag = encryptedBytes.slice(encryptedBytes.length - TAG_BYTES);
    const ct = encryptedBytes.slice(0, encryptedBytes.length - TAG_BYTES);
    return { ct, tag };
};

const decryptAesGcm = async (
    ct: Uint8Array,
    tag: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array
): Promise<Uint8Array> => {
    const combined = new Uint8Array(ct.length + tag.length);
    combined.set(ct, 0);
    combined.set(tag, ct.length);
    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv, tagLength: 128 },
        key,
        combined
    );
    return new Uint8Array(decryptedBuffer);
};

const decryptLegacy = async (
    cipherText: string,
    password: string
): Promise<DecryptionResult> => {
    try {
        const combinedData = CryptoJS.enc.Base64.parse(cipherText);
        const hasVersion =
            combinedData.words.length > 0 && combinedData.words[0] === 1;

        let salt: CryptoJS.lib.WordArray;
        let iv: CryptoJS.lib.WordArray;
        let encryptedWords: number[];

        if (hasVersion) {
            salt = CryptoJS.lib.WordArray.create(combinedData.words.slice(1, 5));
            iv = CryptoJS.lib.WordArray.create(combinedData.words.slice(5, 9));
            encryptedWords = combinedData.words.slice(9);
        } else {
            salt = CryptoJS.lib.WordArray.create(combinedData.words.slice(0, 4));
            iv = CryptoJS.lib.WordArray.create(combinedData.words.slice(4, 8));
            encryptedWords = combinedData.words.slice(8);
        }

        const encrypted = CryptoJS.enc.Base64.stringify(
            CryptoJS.lib.WordArray.create(encryptedWords)
        );

        try {
            const key = CryptoJS.PBKDF2(
                CryptoJS.enc.Utf8.parse(password),
                salt,
                {
                    keySize: 256 / 32,
                    iterations: 1000,
                }
            );

            const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
                iv,
                padding: CryptoJS.pad.Pkcs7,
                mode: CryptoJS.mode.CBC,
            });

            try {
                const utf8Data = decrypted.toString(CryptoJS.enc.Utf8);
                return { data: utf8Data, isUtf8Valid: true };
            } catch {
                return {
                    data: decrypted.toString(CryptoJS.enc.Base64),
                    isUtf8Valid: false,
                };
            }
        } catch {
            try {
                const key = CryptoJS.PBKDF2(password, salt, {
                    keySize: 256 / 32,
                    iterations: 1000,
                });

                const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
                    iv,
                    padding: CryptoJS.pad.Pkcs7,
                    mode: CryptoJS.mode.CBC,
                });

                try {
                    const utf8Data = decrypted.toString(CryptoJS.enc.Utf8);
                    return { data: utf8Data, isUtf8Valid: true };
                } catch {
                    return {
                        data: decrypted.toString(CryptoJS.enc.Base64),
                        isUtf8Valid: false,
                    };
                }
            } catch {
                return { data: "", isUtf8Valid: false };
            }
        }
    } catch (error) {
        console.error("Error decrypting legacy payload:", error);
        throw error;
    }
};

const encryptLegacy = async (
    plaintext: string,
    password: string
): Promise<string> => {
    try {
        const salt = CryptoJS.lib.WordArray.random(128 / 8);
        const passwordUtf8 = CryptoJS.enc.Utf8.parse(password);
        const key = CryptoJS.PBKDF2(passwordUtf8, salt, {
            keySize: 256 / 32,
            iterations: 1000,
        });
        const iv = CryptoJS.lib.WordArray.random(128 / 8);
        const plaintextUtf8 = CryptoJS.enc.Utf8.parse(plaintext);

        const encrypted = CryptoJS.AES.encrypt(plaintextUtf8, key, {
            iv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC,
        });

        const combinedData = CryptoJS.enc.Base64.stringify(
            CryptoJS.lib.WordArray.create([
                ...salt.words,
                ...iv.words,
                ...CryptoJS.enc.Base64.parse(encrypted.toString()).words,
            ])
        );

        return combinedData;
    } catch (error) {
        console.error("Error encrypting legacy payload:", error);
        throw error;
    }
};

const encryptWithPassword = async (
    plaintext: string,
    password: string
): Promise<string> => {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const key = await deriveKeyFromPassword(
        password,
        salt,
        PBKDF2_ITERATIONS
    );
    const plaintextBytes = new TextEncoder().encode(plaintext);
    const { ct, tag } = await encryptAesGcm(plaintextBytes, key, iv);
    return encodeEnvelope({
        v: 2,
        alg: "AES-GCM",
        kdf: "PBKDF2",
        iter: PBKDF2_ITERATIONS,
        salt: toBase64(salt),
        iv: toBase64(iv),
        ct: toBase64(ct),
        tag: toBase64(tag),
    });
};

const decryptWithPassword = async (
    cipherText: string,
    password: string
): Promise<DecryptionResult> => {
    const envelope = decodeEnvelope(cipherText);
    if (!envelope) {
        const legacy = await decryptLegacy(cipherText, password);
        return { ...legacy, wasLegacy: true };
    }

    if (envelope.kdf !== "PBKDF2" || !envelope.salt) {
        return { data: "", isUtf8Valid: false };
    }

    const salt = fromBase64(envelope.salt);
    const key = await deriveKeyFromPassword(
        password,
        salt,
        envelope.iter ?? PBKDF2_ITERATIONS
    );
    const iv = fromBase64(envelope.iv);
    const ct = fromBase64(envelope.ct);
    const tag = fromBase64(envelope.tag);
    const plaintextBytes = await decryptAesGcm(ct, tag, key, iv);
    const decoded = decodeUtf8(plaintextBytes);
    return { ...decoded, wasLegacy: false };
};

const encryptWithMasterKey = async (
    plaintext: string,
    base64MasterKey: string
): Promise<string> => {
    const keyBytes = fromBase64(base64MasterKey);
    const key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const plaintextBytes = new TextEncoder().encode(plaintext);
    const { ct, tag } = await encryptAesGcm(plaintextBytes, key, iv);
    return encodeEnvelope({
        v: 2,
        alg: "AES-GCM",
        kdf: "NONE",
        iv: toBase64(iv),
        ct: toBase64(ct),
        tag: toBase64(tag),
    });
};

const decryptWithMasterKey = async (
    cipherText: string,
    base64MasterKey: string
): Promise<DecryptionResult> => {
    const envelope = decodeEnvelope(cipherText);
    if (!envelope) {
        const legacy = await decryptLegacy(cipherText, base64MasterKey);
        return { ...legacy, wasLegacy: true };
    }

    if (envelope.kdf !== "NONE") {
        return { data: "", isUtf8Valid: false };
    }

    const keyBytes = fromBase64(base64MasterKey);
    const key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
    );
    const iv = fromBase64(envelope.iv);
    const ct = fromBase64(envelope.ct);
    const tag = fromBase64(envelope.tag);
    const plaintextBytes = await decryptAesGcm(ct, tag, key, iv);
    const decoded = decodeUtf8(plaintextBytes);
    return { ...decoded, wasLegacy: false };
};

export async function decryptMasterKey(
    encryptedMasterKey: string,
    password: string
): Promise<DecryptionResult> {
    return decryptWithPassword(encryptedMasterKey, password);
}

export async function encryptExistingMasterKey(
    base64MasterKey: string,
    password: string
): Promise<string> {
    return encryptWithPassword(base64MasterKey, password);
}

export async function encryptAccountData(
    data: string,
    base64MasterKey: string
): Promise<string> {
    return encryptWithMasterKey(data, base64MasterKey);
}

export async function decryptAccountData(
    cipherText: string,
    base64MasterKey: string,
    fallbackPassword?: string,
    forceFallbackPassword: boolean = false
): Promise<DecryptionResult> {
    if (!forceFallbackPassword) {
        try {
            const result = await decryptWithMasterKey(
                cipherText,
                base64MasterKey
            );
            if (result.isUtf8Valid && result.data) {
                return result;
            }
        } catch (error) {
            console.warn("Failed to decrypt with master key:", error);
        }

        const legacyResult = await decryptLegacy(cipherText, base64MasterKey);
        if (legacyResult.isUtf8Valid && legacyResult.data) {
            return { ...legacyResult, wasLegacy: true };
        }
    }

    if (fallbackPassword) {
        const fallbackResult = await decryptLegacy(
            cipherText,
            fallbackPassword
        );
        return {
            ...fallbackResult,
            wasLegacy: true,
            usedFallbackPassword: true,
        };
    }

    return { data: "", isUtf8Valid: false, wasLegacy: true };
}

export async function setupUserEncryption(password: string): Promise<string> {
    const rawMasterKey = crypto.getRandomValues(new Uint8Array(32));
    const masterKeyBase64 = toBase64(rawMasterKey);
    return encryptWithPassword(masterKeyBase64, password);
}

export async function encryptPassword(password: string): Promise<string> {
    const hash = CryptoJS.SHA256(password);
    return hash.toString(CryptoJS.enc.Base64);
}

export async function decryptPassword(encrypted: string): Promise<string> {
    const buffer = fromBase64(encrypted);
    return new TextDecoder().decode(buffer);
}

export { encryptLegacy };
