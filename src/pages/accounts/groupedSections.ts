import type { AccountSection } from "@/components/accounts/types";
import type { Account, AccountGroup } from "@/types/account";

type BuildGroupedSectionsArgs = {
    decryptedAccounts: Account[];
    groups: AccountGroup[];
    defaultGroupId: string | null;
    groupLookup: Map<string, string>;
};

export function buildGroupedSections({
    decryptedAccounts,
    groups,
    defaultGroupId,
    groupLookup,
}: BuildGroupedSectionsArgs): AccountSection[] {
    const fallbackGroupId = defaultGroupId ?? "personal";
    const fallbackGroupName = groupLookup.get(defaultGroupId ?? "") ?? "Personal";

    const groupMap = new Map<string, Account[]>();

    const addToGroup = (groupId: string, account: Account) => {
        const existing = groupMap.get(groupId) ?? [];
        existing.push(account);
        groupMap.set(groupId, existing);
    };

    for (const account of decryptedAccounts) {
        const groupId = account.groupId ?? fallbackGroupId;
        addToGroup(groupId, account);
    }

    const resolveGroupName = (groupId: string) => {
        if (groupId === fallbackGroupId) {
            return fallbackGroupName;
        }
        return groupLookup.get(groupId) ?? "Group";
    };

    const orderedGroupIds: string[] = [];
    for (const group of groups) {
        if (groupMap.has(group.id)) {
            orderedGroupIds.push(group.id);
        }
    }
    for (const groupId of groupMap.keys()) {
        if (!orderedGroupIds.includes(groupId)) {
            orderedGroupIds.push(groupId);
        }
    }

    const sections: AccountSection[] = orderedGroupIds
        .map((groupId) => ({
            id: groupId,
            name: resolveGroupName(groupId),
            accounts: groupMap.get(groupId) ?? [],
            totalCount: (groupMap.get(groupId) ?? []).length,
        }))
        .filter((section) => section.accounts.length > 0);

    return sections;
}
