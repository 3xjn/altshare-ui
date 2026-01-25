import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { AccountGroup } from "@/stores/AccountStore";
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
                <Select value={activeGroupId} onValueChange={onGroupChange}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All groups" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All groups</SelectItem>
                        <SelectItem value="shared">Shared</SelectItem>
                        {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                                {group.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={onCreateGroup}>
                    New group
                </Button>
            </div>
            {selectedCount > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            {selectedCount} selected
                        </Button>
                    </DropdownMenuTrigger>
                    <SelectionMenuContent
                        align="end"
                        className="w-56"
                        groups={groups}
                        selectedCount={selectedCount}
                        onBulkMove={onBulkMove}
                        onBulkDelete={onBulkDelete}
                        onClearSelection={onClearSelection}
                    />
                </DropdownMenu>
            )}
        </div>
    );
}
