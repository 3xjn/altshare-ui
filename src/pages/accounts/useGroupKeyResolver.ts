import { useCallback } from "react";
import { useAccountStore } from "@/stores/AccountStore";
import { decryptMasterKey } from "@/utils/encryption";

type UseGroupKeyResolverArgs = {
    defaultGroupId: string | null;
    groupKeys: Record<string, string>;
    loadGroups: () => Promise<void>;
    encryptedMasterKey: string | null;
    currentPassword: string | null;
};

export function useGroupKeyResolver({
    defaultGroupId,
    groupKeys,
    loadGroups,
    encryptedMasterKey,
    currentPassword,
}: UseGroupKeyResolverArgs) {
    return useCallback(
        async (requestedGroupId?: string | null) => {
            const groupId = requestedGroupId || defaultGroupId;
            if (!groupId) {
                throw new Error("Missing group selection");
            }

            let groupKey = groupKeys[groupId];
            if (!groupKey) {
                await loadGroups();
                const refreshedGroupKey = useAccountStore.getState().groupKeys[groupId];
                if (refreshedGroupKey) {
                    groupKey = refreshedGroupKey;
                }
            }

            if (!groupKey) {
                if (!encryptedMasterKey || !currentPassword) {
                    throw new Error("Missing master key or password");
                }

                const decryptedMasterKey = await decryptMasterKey(
                    encryptedMasterKey,
                    currentPassword
                );
                if (!decryptedMasterKey.isUtf8Valid || !decryptedMasterKey.data) {
                    throw new Error("Failed to decrypt master key");
                }

                if (groupId !== defaultGroupId) {
                    throw new Error("Group key not loaded");
                }

                groupKey = decryptedMasterKey.data;
            }

            return { groupId, groupKey };
        },
        [
            currentPassword,
            defaultGroupId,
            encryptedMasterKey,
            groupKeys,
            loadGroups,
        ]
    );
}
