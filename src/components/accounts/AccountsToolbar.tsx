import { Button, Group, Menu, NativeSelect } from "@mantine/core";
import type { AccountGroup } from "@/types/account";
import { SelectionMenuContent } from "@/components/accounts/SelectionMenuContent";

type AccountsToolbarProps = {
    activeGroupId: string;
    groups: AccountGroup[];
    selectedCount: number;
    onGroupChange: (value: string) => void;
    onCreateGroup: () => void;
    onBulkMove: (groupId: string) => void;
    onBulkDelete: () => void;
    onClearSelection: () => void;
};

export function AccountsToolbar({
    activeGroupId,
    groups,
    selectedCount,
    onGroupChange,
    onCreateGroup,
    onBulkMove,
    onBulkDelete,
    onClearSelection,
}: AccountsToolbarProps) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
            <Group gap="sm" align="end" className="min-w-0 flex-1" wrap="wrap">
                <NativeSelect
                    value={activeGroupId}
                    onChange={(event) => onGroupChange(event.currentTarget.value)}
                    style={{
                        flex: "1 1 14rem",
                        minWidth: "12rem",
                        maxWidth: "18rem",
                    }}
                    data={[
                        { value: "all", label: "All groups" },
                        { value: "shared", label: "Shared" },
                        ...groups.map((group) => ({
                            value: group.id,
                            label: group.name,
                        })),
                    ]}
                />
                <Button variant="outline" size="compact-sm" onClick={onCreateGroup}>
                    New group
                </Button>
            </Group>
            {selectedCount > 0 && (
                <Menu position="bottom-end" shadow="md" width={224} withinPortal>
                    <Menu.Target>
                        <Button variant="outline" size="compact-sm">
                            {selectedCount} selected
                        </Button>
                    </Menu.Target>
                    <SelectionMenuContent
                        groups={groups}
                        selectedCount={selectedCount}
                        onBulkMove={onBulkMove}
                        onBulkDelete={onBulkDelete}
                        onClearSelection={onClearSelection}
                    />
                </Menu>
            )}
        </div>
    );
}
