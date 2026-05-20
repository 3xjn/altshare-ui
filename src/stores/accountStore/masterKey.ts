import { authApi } from "@/services/AuthApi";
import { decryptMasterKey, encryptExistingMasterKey } from "@/utils/encryption";

type ResolveMasterKeyParams = {
    currentPassword: string | null;
    encryptedMasterKey: string | null;
    setEncryptedMasterKey: (value: string) => void;
};

export const resolveMasterKey = async ({
    currentPassword,
    encryptedMasterKey,
    setEncryptedMasterKey,
}: ResolveMasterKeyParams): Promise<string | null> => {
    if (!currentPassword || !encryptedMasterKey) {
        console.error("Password or encryption key is null.");
        return null;
    }

    const decryptedKeyResult = await decryptMasterKey(
        encryptedMasterKey,
        currentPassword
    );
    if (!decryptedKeyResult.isUtf8Valid) {
        console.error("Failed to decrypt master key - invalid UTF-8 data");
        return null;
    }

    const decryptedKey = decryptedKeyResult.data;

    if (decryptedKeyResult.wasLegacy) {
        try {
            const updatedEncryptedKey = await encryptExistingMasterKey(
                decryptedKey,
                currentPassword
            );
            await authApi.updateUserSecurityProfile(updatedEncryptedKey);
            setEncryptedMasterKey(updatedEncryptedKey);
        } catch (error) {
            console.warn("Failed to migrate encrypted master key:", error);
        }
    }

    return decryptedKey;
};
