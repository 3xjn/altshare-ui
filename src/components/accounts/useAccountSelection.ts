import { useEffect, useMemo, useRef, useState } from "react";
import { accountApi } from "@/services/AccountApi";
import { encryptAccountData } from "@/utils/encryption";
import type { Account } from "@/stores/AccountStore";
import type { AccountSection } from "@/components/accounts/types";
import type { Toast } from "@/hooks/use-toast";

type ResolveGroupKey = (
    groupId?: string | null
) => Promise<{ groupId: string; groupKey: string }>;

type UseAccountSelectionArgs = {
    accounts: Account[];
    sections: AccountSection[];
    defaultGroupId: string | null;
    resolveGroupKey: ResolveGroupKey;
    loadAccounts: () => Promise<void>;
    getRanks: () => Promise<void>;
    toast: (args: Toast) => void;
};

export function useAccountSelection({
    accounts,
    sections,
    defaultGroupId,
    resolveGroupKey,
    loadAccounts,
    getRanks,
    toast,
}: UseAccountSelectionArgs) {
    const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(
        new Set()
    );
    const [contextMenuAccountId, setContextMenuAccountId] = useState<
        string | null
    >(null);
    const contextMenuPositionRef = useRef<{ x: number; y: number } | null>(
        null
    );
    const lastSelectedIndexRef = useRef<number | null>(null);

    const orderedSelectableIds = useMemo(() => {
        const ids: string[] = [];
        for (const section of sections) {
            for (const account of section.accounts) {
                if (!account.isShared && account.id) {
                    ids.push(account.id);
                }
            }
        }
        return ids;
    }, [sections]);

    useEffect(() => {
        lastSelectedIndexRef.current = null;
    }, [orderedSelectableIds]);

    useEffect(() => {
        const validIds = new Set(
            accounts
                .filter((account) => !account.isShared && account.id)
                .map((account) => account.id as string)
        );

        setSelectedAccountIds((prev) => {
            if (prev.size === 0) return prev;

            const next = new Set<string>();
            prev.forEach((id) => {
                if (validIds.has(id)) {
                    next.add(id);
                }
            });

            return next.size === prev.size ? prev : next;
        });

        setContextMenuAccountId((prev) => {
            if (prev && !validIds.has(prev)) {
                contextMenuPositionRef.current = null;
                return null;
            }
            return prev;
        });
    }, [accounts]);

    const selectedAccounts = useMemo(() => {
        if (selectedAccountIds.size === 0) return [];
        return accounts.filter(
            (account) =>
                !account.isShared &&
                account.id &&
                selectedAccountIds.has(account.id)
        );
    }, [accounts, selectedAccountIds]);

    const clearSelection = () => {
        lastSelectedIndexRef.current = null;
        setContextMenuAccountId(null);
        contextMenuPositionRef.current = null;
        setSelectedAccountIds(new Set());
    };

    const shouldIgnoreRowClick = (event: React.MouseEvent) => {
        const target = event.target as HTMLElement | null;
        if (!target) return false;
        return Boolean(
            target.closest(
                "button, a, input, textarea, select, [data-no-row-select='true']"
            )
        );
    };

    const handleRowMouseDown = (event: React.MouseEvent) => {
        if (event.button !== 0) return;
        if (shouldIgnoreRowClick(event)) return;
        event.preventDefault();
    };

    const handleRowClick = (event: React.MouseEvent, account: Account) => {
        if (account.isShared || !account.id) return;
        if (shouldIgnoreRowClick(event)) return;

        const currentIndex = orderedSelectableIds.indexOf(account.id);
        if (currentIndex < 0) return;

        const isShift = event.shiftKey;
        const isMeta = event.metaKey || event.ctrlKey;

        setSelectedAccountIds((prev) => {
            let next = new Set(prev);
            if (isShift && lastSelectedIndexRef.current !== null) {
                const start = Math.min(
                    lastSelectedIndexRef.current,
                    currentIndex
                );
                const end = Math.max(
                    lastSelectedIndexRef.current,
                    currentIndex
                );
                const rangeIds = orderedSelectableIds.slice(start, end + 1);
                if (isMeta) {
                    rangeIds.forEach((id) => next.add(id));
                } else {
                    next = new Set(rangeIds);
                }
            } else if (isMeta) {
                if (next.has(account.id)) {
                    next.delete(account.id);
                } else {
                    next.add(account.id);
                }
            } else {
                next = new Set([account.id]);
            }
            return next;
        });

        lastSelectedIndexRef.current = currentIndex;
    };

    const handleRowContextMenu = (
        event: React.MouseEvent,
        account: Account
    ) => {
        if (account.isShared || !account.id) return;
        if (event.defaultPrevented) return;

        event.preventDefault();
        contextMenuPositionRef.current = {
            x: event.clientX,
            y: event.clientY,
        };

        const currentIndex = orderedSelectableIds.indexOf(account.id);
        if (currentIndex >= 0) {
            lastSelectedIndexRef.current = currentIndex;
        }

        setSelectedAccountIds((prev) => {
            if (prev.has(account.id)) {
                return prev;
            }
            return new Set([account.id]);
        });

        setContextMenuAccountId(account.id);
    };

    const handleContextMenuOpenChange = (
        open: boolean,
        accountId: string
    ) => {
        if (open) return;
        if (contextMenuAccountId !== accountId) return;
        setContextMenuAccountId(null);
        contextMenuPositionRef.current = null;
    };

    const handleBulkMove = async (targetGroupId: string) => {
        if (selectedAccounts.length === 0) {
            toast({
                variant: "destructive",
                title: "No accounts selected",
                description: "Select accounts before moving them.",
            });
            return;
        }

        if (!targetGroupId) {
            toast({
                variant: "destructive",
                title: "Missing target group",
                description: "Choose a group to move accounts into.",
            });
            return;
        }

        try {
            const {
                groupId: resolvedGroupId,
                groupKey,
            } = await resolveGroupKey(targetGroupId);

            await Promise.all(
                selectedAccounts.map(async (account) => {
                    if (!account.id) return;
                    const currentGroupId =
                        account.groupId ?? defaultGroupId ?? null;
                    if (currentGroupId === resolvedGroupId) return;

                    const payload = {
                        username: account.username,
                        password: account.password,
                        notes: account.notes ?? "",
                        game: account.game ?? "",
                        gameData: account.gameData ?? undefined,
                    };
                    const encryptedData = await encryptAccountData(
                        JSON.stringify(payload),
                        groupKey
                    );
                    await accountApi.editAccount(account.id, {
                        encryptedData,
                        groupId: resolvedGroupId,
                    });
                })
            );

            clearSelection();
            await loadAccounts();
            void getRanks();
            toast({
                title: "Success",
                description: "Accounts moved successfully.",
            });
        } catch (error) {
            console.error("Failed to move accounts:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to move accounts.",
            });
        }
    };

    const handleBulkDelete = async () => {
        if (selectedAccounts.length === 0) {
            toast({
                variant: "destructive",
                title: "No accounts selected",
                description: "Select accounts before deleting them.",
            });
            return;
        }

        const confirmed = window.confirm(
            `Delete ${selectedAccounts.length} account${
                selectedAccounts.length === 1 ? "" : "s"
            }? This cannot be undone.`
        );
        if (!confirmed) return;

        try {
            await Promise.all(
                selectedAccounts.map((account) =>
                    account.id ? accountApi.deleteAccount(account.id) : null
                )
            );

            clearSelection();
            await loadAccounts();
            void getRanks();
            toast({
                title: "Success",
                description: "Accounts deleted successfully.",
            });
        } catch (error) {
            console.error("Failed to delete accounts:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete accounts.",
            });
        }
    };

    return {
        selectedAccountIds,
        selectedAccounts,
        selectedCount: selectedAccounts.length,
        contextMenuAccountId,
        contextMenuPositionRef,
        handleRowMouseDown,
        handleRowClick,
        handleRowContextMenu,
        handleContextMenuOpenChange,
        clearSelection,
        handleBulkMove,
        handleBulkDelete,
    };
}
