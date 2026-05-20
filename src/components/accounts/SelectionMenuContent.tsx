import { Menu } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import type { AccountGroup } from "@/types/account";

type SelectionMenuContentProps = {
    groups: AccountGroup[];
    selectedCount: number;
    onBulkMove: (groupId: string) => void;
    onBulkDelete: () => void;
    onClearSelection: () => void;
};

export function SelectionMenuContent({
    groups,
    selectedCount,
    onBulkMove,
    onBulkDelete,
    onClearSelection,
}: SelectionMenuContentProps) {
    return (
        <Menu.Dropdown>
            <Menu.Label>{selectedCount} selected</Menu.Label>
            <Menu.Divider />
            <Menu.Sub>
                <Menu.Sub.Target>
                    <Menu.Sub.Item
                        rightSection={<ChevronRight className="h-4 w-4" />}
                    >
                        Move to group
                    </Menu.Sub.Item>
                </Menu.Sub.Target>
                <Menu.Sub.Dropdown>
                    {groups.length > 0 ? (
                        groups.map((group) => (
                            <Menu.Item
                                key={group.id}
                                onClick={() => onBulkMove(group.id)}
                            >
                                {group.name}
                            </Menu.Item>
                        ))
                    ) : (
                        <Menu.Item disabled>No groups available</Menu.Item>
                    )}
                </Menu.Sub.Dropdown>
            </Menu.Sub>
            <Menu.Item color="red" onClick={onBulkDelete}>
                Delete selected
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item onClick={onClearSelection}>
                Clear selection
            </Menu.Item>
        </Menu.Dropdown>
    );
}
