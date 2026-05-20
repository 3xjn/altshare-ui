import { Paper, Stack } from "@mantine/core";
import "../services/SignalR";
import { useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAccountStore } from "@/stores/AccountStore";
import { useToast } from "@/hooks/use-toast";
import { PasswordPrompt } from "@/components/PasswordPrompt";
import AddAccountDialog from "@/components/AddAccountDialog";
import { AccountsHeader } from "@/components/accounts/AccountsHeader";
import { AccountsTable } from "@/components/accounts/AccountsTable";
import { SelectionActionBar } from "@/components/accounts/SelectionActionBar";
import { useAccountSelection } from "@/components/accounts/useAccountSelection";
import { buildGroupedSections } from "@/pages/accounts/groupedSections";
import { useAccountsLifecycle } from "@/pages/accounts/useAccountsLifecycle";
import { useGroupKeyResolver } from "@/pages/accounts/useGroupKeyResolver";
import { useAccountCrudOrchestration } from "@/pages/accounts/useAccountCrudOrchestration";

export function Accounts() {
    const {
        isAuthenticated,
        currentPassword,
        setCurrentPassword,
        encryptedMasterKey,
        groups,
        groupKeys,
        defaultGroupId,
        decryptedAccounts,
        loadGroups,
        loadAccounts,
        loadSharedAccounts,
        getRanks,
    } = useAccountStore();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(
        new Set()
    );
    const isTestMode = searchParams.get("test") === "true";

    const groupLookup = useMemo(() => {
        return new Map(groups.map((group) => [group.id, group.name]));
    }, [groups]);

    const ownedAccounts = useMemo(
        () => decryptedAccounts.filter((account) => !account.isShared),
        [decryptedAccounts]
    );

    const existingGames = useMemo(() => {
        return Array.from(
            new Set(
                decryptedAccounts
                    .map((account) => account.game?.trim())
                    .filter(
                        (game): game is string =>
                            Boolean(game) && game !== "None"
                    )
            )
        ).sort((left, right) => left.localeCompare(right));
    }, [decryptedAccounts]);

    const { isLoading, refreshAccounts } = useAccountsLifecycle({
        isAuthenticated,
        currentPassword,
        loadGroups,
        loadAccounts,
        loadSharedAccounts,
        getRanks,
        toast,
    });

    const resolveGroupKey = useGroupKeyResolver({
        defaultGroupId,
        groupKeys,
        loadGroups,
        encryptedMasterKey,
        currentPassword,
    });

    const {
        createOpen,
        showPasswordPrompt,
        editingDefaultValues,
        accountFormRef,
        setShowPasswordPrompt,
        handleSetCreateOpen,
        handleSubmit,
        handlePasswordSubmit,
        handleEdit,
        handleDelete,
    } = useAccountCrudOrchestration({
        currentPassword,
        encryptedMasterKey,
        defaultGroupId,
        setCurrentPassword,
        loadAccounts,
        getRanks,
        resolveGroupKey,
        toast,
    });

    const groupedSections = useMemo(
        () =>
            buildGroupedSections({
                decryptedAccounts: ownedAccounts,
                groups,
                defaultGroupId,
                groupLookup,
            }),
        [ownedAccounts, groups, defaultGroupId, groupLookup]
    );

    const visibleSections = useMemo(
        () =>
            groupedSections.map((section) => ({
                ...section,
                collapsed: collapsedSectionIds.has(section.id),
                totalCount: section.totalCount ?? section.accounts.length,
                accounts: collapsedSectionIds.has(section.id) ? [] : section.accounts,
            })),
        [collapsedSectionIds, groupedSections]
    );

    const totalAccounts = groupedSections.reduce(
        (sum, section) => sum + section.accounts.length,
        0
    );

    const {
        selectedAccountIds,
        selectedCount,
        contextMenuAccountId,
        contextMenuPositionRef,
        handleRowMouseDown,
        handleRowClick,
        handleRowContextMenu,
        handleContextMenuOpenChange,
        clearSelection,
        handleBulkMove,
        handleBulkDelete,
    } = useAccountSelection({
        accounts: ownedAccounts,
        sections: visibleSections,
        defaultGroupId,
        resolveGroupKey,
        loadAccounts,
        getRanks,
        toast,
    });

    const toggleSection = (sectionId: string) => {
        setCollapsedSectionIds((prev) => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    };

    if (!isAuthenticated && !isTestMode) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="space-y-6">
            <AccountsHeader
                onRefresh={() => void refreshAccounts()}
                onAddAccount={() => handleSetCreateOpen(true)}
            />

            <Stack gap="md">
                <SelectionActionBar
                    selectedCount={selectedCount}
                    groups={groups}
                    onBulkMove={handleBulkMove}
                    onBulkDelete={handleBulkDelete}
                    onClearSelection={clearSelection}
                />

                <Paper withBorder radius="lg" shadow="xs">
                    <AccountsTable
                        isLoading={isLoading}
                        sections={visibleSections}
                        totalAccounts={totalAccounts}
                        groups={groups}
                        selectedAccountIds={selectedAccountIds}
                        contextMenuAccountId={contextMenuAccountId}
                        contextMenuPositionRef={contextMenuPositionRef}
                        selectedCount={selectedCount}
                        onRowMouseDown={handleRowMouseDown}
                        onRowClick={handleRowClick}
                        onRowContextMenu={handleRowContextMenu}
                        onContextMenuOpenChange={handleContextMenuOpenChange}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onBulkMove={handleBulkMove}
                        onBulkDelete={handleBulkDelete}
                        onClearSelection={clearSelection}
                        onToggleSection={toggleSection}
                        onAddAccount={() => handleSetCreateOpen(true)}
                    />
                </Paper>
            </Stack>

            <AddAccountDialog
                open={createOpen}
                setOpen={handleSetCreateOpen}
                handleSubmit={handleSubmit}
                formRef={accountFormRef}
                defaultValues={editingDefaultValues}
                groups={groups}
                defaultGroupId={defaultGroupId}
                existingGames={existingGames}
            />

            {showPasswordPrompt && (
                <PasswordPrompt
                    onConfirm={() => setShowPasswordPrompt(false)}
                    onPasswordEntered={handlePasswordSubmit}
                />
            )}
        </div>
    );
}
