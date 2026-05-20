import { groupApi } from "@/services/GroupApi";
import type { AccountGroup } from "@/types/account";
import { decryptAccountData } from "@/utils/encryption";

export type LoadedGroupsState = {
    groups: AccountGroup[];
    groupKeys: Record<string, string>;
    defaultGroupId: string | null;
};

export const loadGroupsWithMasterKey = async (
    masterKey: string
): Promise<LoadedGroupsState | null> => {
    const response = await groupApi.getGroups();
    if (!Array.isArray(response)) {
        console.warn("Unexpected group response:", response);
        return null;
    }

    const groupKeys: Record<string, string> = {};
    let defaultGroupId: string | null = null;

    for (const group of response) {
        if (group.usesMasterKey || !group.encryptedGroupKey) {
            groupKeys[group.id] = masterKey;
            if (group.usesMasterKey) {
                defaultGroupId = group.id;
            }
            continue;
        }

        try {
            const decryptedResult = await decryptAccountData(
                group.encryptedGroupKey,
                masterKey
            );
            if (!decryptedResult.isUtf8Valid || !decryptedResult.data) {
                console.warn(`Failed to decrypt group key for ${group.name}`);
                continue;
            }
            groupKeys[group.id] = decryptedResult.data;
        } catch (error) {
            console.warn(`Failed to decrypt group key for ${group.name}:`, error);
        }
    }

    if (!defaultGroupId) {
        const masterGroup = response.find((group) => group.usesMasterKey);
        defaultGroupId = masterGroup?.id ?? null;
    }

    return {
        groups: response,
        groupKeys,
        defaultGroupId,
    };
};
