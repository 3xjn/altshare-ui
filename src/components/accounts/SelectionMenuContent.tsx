import {
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import type { AccountGroup } from "@/stores/AccountStore";

type SelectionMenuContentProps = {
    align?: "start" | "center" | "end";
    className?: string;
    groups: AccountGroup[];
    selectedCount: number;
    onBulkMove: (groupId: string) => void;
    onBulkDelete: () => void;
    onClearSelection: () => void;
};

export function SelectionMenuContent({
    align,
    className,
    groups,
    selectedCount,
    onBulkMove,
    onBulkDelete,
    onClearSelection,
}: SelectionMenuContentProps) {
    return (
        <DropdownMenuContent align={align} className={className}>
            <DropdownMenuLabel>{selectedCount} selected</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>Move to group</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                    {groups.length > 0 ? (
                        groups.map((group) => (
                            <DropdownMenuItem
                                key={group.id}
                                onSelect={() => onBulkMove(group.id)}
                            >
                                {group.name}
                            </DropdownMenuItem>
                        ))
                    ) : (
                        <DropdownMenuItem disabled>
                            No groups available
                        </DropdownMenuItem>
                    )}
                </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
                onSelect={onBulkDelete}
                className="text-destructive focus:text-destructive"
            >
                Delete selected
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onClearSelection}>
                Clear selection
            </DropdownMenuItem>
        </DropdownMenuContent>
    );
}
