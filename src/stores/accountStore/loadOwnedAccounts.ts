import { accountApi } from "@/services/AccountApi";
import type { Account } from "@/types/account";
import { decryptAccountData, encryptAccountData } from "@/utils/encryption";
import { isAccount, parseStoredAccountData } from "@/stores/accountStore/storedAccountData";

type LoadOwnedAccountsParams = {
    masterKey: string;
    groupKeys: Record<string, string>;
    defaultGroupId: string | null;
    currentPassword: string | null;
};

type LoadOwnedAccountsResult = {
    accounts: Account[];
    migrationTasks: Promise<void>[];
};

export const loadOwnedAccounts = async ({
    masterKey,
    groupKeys,
    defaultGroupId,
    currentPassword,
}: LoadOwnedAccountsParams): Promise<LoadOwnedAccountsResult> => {
    const response = await accountApi.getAccounts();
    if (response.length === 0) {
        return {
            accounts: [],
            migrationTasks: [],
        };
    }

    const migrationTasks: Promise<void>[] = [];

    const accounts = await Promise.all(
        response.map(async (encryptedAccount): Promise<Account | null> => {
            if (!encryptedAccount || !encryptedAccount.encryptedData) {
                console.warn(
                    `Invalid encrypted account data found, skipping ${encryptedAccount.id}`
                );
                return null;
            }

            const resolvedGroupId =
                encryptedAccount.groupId || defaultGroupId || undefined;
            const groupKey =
                resolvedGroupId && groupKeys[resolvedGroupId]
                    ? groupKeys[resolvedGroupId]
                    : masterKey;

            if (resolvedGroupId && !groupKeys[resolvedGroupId]) {
                console.warn(
                    `Missing group key for ${resolvedGroupId}, falling back to master key`
                );
            }

            try {
                let decryptedResult = await decryptAccountData(
                    encryptedAccount.encryptedData,
                    groupKey,
                    currentPassword ?? undefined
                );
                if (!decryptedResult.isUtf8Valid) {
                    console.warn(
                        `Account ${encryptedAccount.id} contained invalid UTF-8 data, skipping`
                    );
                    return null;
                }

                if (!decryptedResult.data || decryptedResult.data.trim() === "") {
                    console.warn(
                        `Account ${encryptedAccount.id} had empty decrypted data, skipping`
                    );
                    return null;
                }

                try {
                    const parsedData = parseStoredAccountData(decryptedResult.data);
                    if (!parsedData) {
                        console.warn(
                            `Account ${encryptedAccount.id} missing required fields, skipping`
                        );
                        return null;
                    }

                    if (decryptedResult.wasLegacy && encryptedAccount.id) {
                        migrationTasks.push(
                            (async () => {
                                const migrated = await encryptAccountData(
                                    decryptedResult.data,
                                    groupKey
                                );
                                await accountApi.editAccount(encryptedAccount.id, {
                                    encryptedData: migrated,
                                    groupId: resolvedGroupId,
                                });
                            })()
                        );
                    }
                    return {
                        ...parsedData,
                        id: encryptedAccount.id,
                        groupId: resolvedGroupId,
                        isLoadingRank: false,
                    };
                } catch (parseError) {
                    if (currentPassword && !decryptedResult.usedFallbackPassword) {
                        decryptedResult = await decryptAccountData(
                            encryptedAccount.encryptedData,
                            groupKey,
                            currentPassword,
                            true
                        );
                        if (
                            decryptedResult.isUtf8Valid &&
                            decryptedResult.data &&
                            decryptedResult.data.trim() !== ""
                        ) {
                            try {
                                const parsedData = parseStoredAccountData(
                                    decryptedResult.data
                                );
                                if (!parsedData) {
                                    console.warn(
                                        `Account ${encryptedAccount.id} missing required fields after fallback, skipping`
                                    );
                                    return null;
                                }

                                if (decryptedResult.wasLegacy && encryptedAccount.id) {
                                    migrationTasks.push(
                                        (async () => {
                                            const migrated = await encryptAccountData(
                                                decryptedResult.data,
                                                groupKey
                                            );
                                            await accountApi.editAccount(
                                                encryptedAccount.id,
                                                {
                                                    encryptedData: migrated,
                                                    groupId: resolvedGroupId,
                                                }
                                            );
                                        })()
                                    );
                                }

                                return {
                                    ...parsedData,
                                    id: encryptedAccount.id,
                                    groupId: resolvedGroupId,
                                    isLoadingRank: false,
                                };
                            } catch (fallbackParseError) {
                                console.error(
                                    `Failed to parse JSON after fallback for account ${encryptedAccount.id}:`,
                                    fallbackParseError
                                );
                            }
                        }
                    }

                    console.error(
                        `Failed to parse JSON for account ${encryptedAccount.id}:`,
                        parseError
                    );
                    return null;
                }
            } catch (error) {
                console.error(
                    `Failed to decrypt account ${encryptedAccount.id}:`,
                    error
                );
                return null;
            }
        })
    );

    return {
        accounts: accounts.filter(isAccount),
        migrationTasks,
    };
};
