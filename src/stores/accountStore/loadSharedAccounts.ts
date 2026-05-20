import { accountApi } from "@/services/AccountApi";
import type { Account } from "@/types/account";
import {
    base64ToArrayBuffer,
    decryptDataToBase64,
    deriveEncryptionKey,
} from "@/utils/crypto";
import { decryptAccountData } from "@/utils/encryption";
import { isAccount, parseStoredAccountData } from "@/stores/accountStore/storedAccountData";

export const loadSharedAccountsForPassword = async (
    password: string
): Promise<Account[]> => {
    const response = await accountApi.getSharedAccounts();
    const groupKeyCache: Record<string, string> = {};

    const accounts = await Promise.all(
        response.encryptedAccounts.map(
            async (encryptedAccount): Promise<Account | null> => {
                if (!encryptedAccount || !encryptedAccount.encryptedData) {
                    console.warn(
                        "Invalid shared encrypted account data found, skipping"
                    );
                    return null;
                }

                if (
                    !encryptedAccount.encryptedGroupKey ||
                    !encryptedAccount.iv ||
                    !encryptedAccount.salt ||
                    !encryptedAccount.tag
                ) {
                    console.warn("Shared account missing key material, skipping");
                    return null;
                }

                try {
                    const cacheKey = encryptedAccount.groupId ?? "";
                    let sharedGroupKey = cacheKey
                        ? groupKeyCache[cacheKey]
                        : undefined;

                    if (!sharedGroupKey) {
                        const derivedKey = await deriveEncryptionKey(
                            password,
                            base64ToArrayBuffer(encryptedAccount.salt)
                        );
                        sharedGroupKey = await decryptDataToBase64(
                            encryptedAccount.encryptedGroupKey,
                            encryptedAccount.iv,
                            encryptedAccount.tag,
                            derivedKey
                        );
                        if (cacheKey) {
                            groupKeyCache[cacheKey] = sharedGroupKey;
                        }
                    }
                    const decryptedResult = await decryptAccountData(
                        encryptedAccount.encryptedData,
                        sharedGroupKey
                    );
                    if (!decryptedResult.isUtf8Valid) {
                        console.warn(
                            `Shared account ${encryptedAccount.id} contained invalid UTF-8 data, skipping`
                        );
                        return null;
                    }

                    if (!decryptedResult.data || decryptedResult.data.trim() === "") {
                        console.warn(
                            `Shared account ${encryptedAccount.id} had empty decrypted data, skipping`
                        );
                        return null;
                    }

                    try {
                        const parsedData = parseStoredAccountData(
                            decryptedResult.data
                        );
                        if (!parsedData) {
                            console.warn(
                                `Shared account ${encryptedAccount.id} missing required fields, skipping`
                            );
                            return null;
                        }
                        return {
                            ...parsedData,
                            id: encryptedAccount.id ?? "",
                            groupId: encryptedAccount.groupId,
                            isShared: true,
                            isLoadingRank: false,
                        };
                    } catch (parseError) {
                        console.error(
                            `Failed to parse JSON for shared account ${encryptedAccount.id}:`,
                            parseError
                        );
                        return null;
                    }
                } catch (error) {
                    console.error(
                        `Failed to decrypt shared account ${encryptedAccount.id}:`,
                        error
                    );
                    return null;
                }
            }
        )
    );

    return accounts.filter(isAccount);
};
