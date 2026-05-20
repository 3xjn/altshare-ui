import { Button, Group, Menu, Paper, Text } from "@mantine/core";
import { ChevronDown, Trash2, X } from "lucide-react";
import type { AccountGroup } from "@/types/account";

type SelectionActionBarProps = {
    selectedCount: number;
    groups: AccountGroup[];
    onBulkMove: (groupId: string) => void;
    onBulkDelete: () => void;
    onClearSelection: () => void;
};

export function SelectionActionBar({
    selectedCount,
    groups,
    onBulkMove,
    onBulkDelete,
    onClearSelection,
}: SelectionActionBarProps) {
    if (selectedCount === 0) {
        return null;
    }

    return (
        <Paper withBorder radius="md" p="sm">
            <Group justify="space-between" gap="sm" wrap="wrap">
                <Text fw={600}>{selectedCount} selected</Text>
                <Group gap="sm" wrap="wrap">
                    <Menu position="bottom-end" shadow="md" width={220} withinPortal>
                        <Menu.Target>
                            <Button variant="outline" rightSection={<ChevronDown size={16} />}>
                                Move
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {groups.length > 0 ? (
                                groups.map((group) => (
                                    <Menu.Item key={group.id} onClick={() => onBulkMove(group.id)}>
                                        {group.name}
                                    </Menu.Item>
                                ))
                            ) : (
                                <Menu.Item disabled>No groups available</Menu.Item>
                            )}
                        </Menu.Dropdown>
                    </Menu>
                    <Button color="red" variant="light" leftSection={<Trash2 size={16} />} onClick={onBulkDelete}>
                        Delete
                    </Button>
                    <Button variant="subtle" leftSection={<X size={16} />} onClick={onClearSelection}>
                        Clear
                    </Button>
                </Group>
            </Group>
        </Paper>
    );
}
