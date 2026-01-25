import { Fragment, type MutableRefObject } from "react";
import { TextLabel } from "@/components/ui/text-label";
import { ExpandableNotes } from "@/components/ui/expandable-notes";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import type { Account, AccountGroup } from "@/stores/AccountStore";
import type { AccountSection } from "@/components/accounts/types";
import { SelectionMenuContent } from "@/components/accounts/SelectionMenuContent";
import { AccountDetails } from "@/components/accounts/AccountDetails";
import { GameBadge } from "@/components/accounts/GameBadge";

type AccountsTableProps = {
    isLoading: boolean;
    sections: AccountSection[];
    totalAccounts: number;
    groups: AccountGroup[];
    selectedAccountIds: Set<string>;
    expandedAccountKeys: Set<string>;
    contextMenuAccountId: string | null;
    contextMenuPositionRef: MutableRefObject<{
        x: number;
        y: number;
    } | null>;
    selectedCount: number;
    onRowMouseDown: (event: React.MouseEvent) => void;
    onRowClick: (event: React.MouseEvent, account: Account) => void;
    onRowContextMenu: (event: React.MouseEvent, account: Account) => void;
    onContextMenuOpenChange: (open: boolean, accountId: string) => void;
    onToggleDetails: (detailKey: string) => void;
    onEdit: (account: Account) => void;
    onDelete: (account: Account) => void;
    onBulkMove: (groupId: string) => void;
    onBulkDelete: () => void;
    onClearSelection: () => void;
};

export function AccountsTable({
    isLoading,
    sections,
    totalAccounts,
    groups,
    selectedAccountIds,
    expandedAccountKeys,
    contextMenuAccountId,
    contextMenuPositionRef,
    selectedCount,
    onRowMouseDown,
    onRowClick,
    onRowContextMenu,
    onContextMenuOpenChange,
    onToggleDetails,
    onEdit,
    onDelete,
    onBulkMove,
    onBulkDelete,
    onClearSelection,
}: AccountsTableProps) {
    return (
        <div className="px-6">
            <Table className="select-none">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[140px]">Game</TableHead>
                        <TableHead className="w-[200px]">Username</TableHead>
                        <TableHead className="w-[200px]">Password</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-[130px] text-right">
                            Actions
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32">
                                <div className="flex items-center justify-center gap-3">
                                    <svg
                                        className="animate-spin h-5 w-5 text-muted-foreground"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    <span className="text-sm text-muted-foreground">
                                        Loading accounts...
                                    </span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : totalAccounts === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32">
                                <div className="flex flex-col items-center justify-center text-center">
                                    <h3 className="font-medium">
                                        No accounts yet
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Add an account to get started
                                    </p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        sections.map((section) => (
                            <Fragment key={`section-${section.id}`}>
                                <TableRow className="bg-muted/30">
                                    <TableCell
                                        colSpan={5}
                                        className="text-sm font-semibold text-foreground"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{section.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {section.accounts.length}{" "}
                                                accounts
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                                {section.accounts.map((account, index) => {
                                    const isSelectable =
                                        !account.isShared && !!account.id;
                                    const isSelected =
                                        isSelectable &&
                                        selectedAccountIds.has(account.id);
                                    const rowKey = account.id
                                        ? account.id
                                        : `${section.id}-${index}`;
                                    const detailKey = account.id
                                        ? account.id
                                        : rowKey;
                                    const isExpanded =
                                        expandedAccountKeys.has(detailKey);
                                    const isContextMenuOpen =
                                        isSelectable &&
                                        account.id === contextMenuAccountId;
                                    const DetailsIcon = isExpanded
                                        ? ChevronUp
                                        : ChevronDown;
                                    const detailsLabel = isExpanded
                                        ? "Collapse details"
                                        : "Expand details";
                                    const rowClassName = [
                                        "group hover:bg-accent/5",
                                        "select-none",
                                        isSelectable ? "cursor-pointer" : "",
                                        isSelected
                                            ? "bg-gradient-to-r from-accent/45 via-accent/25 to-transparent"
                                            : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" ");

                                    return (
                                        <Fragment key={rowKey}>
                                                <DropdownMenu
                                                    open={isContextMenuOpen}
                                                    onOpenChange={(open) =>
                                                        account.id
                                                            ? onContextMenuOpenChange(
                                                                  open,
                                                                  account.id
                                                              )
                                                            : undefined
                                                    }
                                                >
                                                <TableRow
                                                    className={rowClassName}
                                                    aria-selected={isSelected}
                                                    data-state={
                                                        isSelected
                                                            ? "selected"
                                                            : undefined
                                                    }
                                                    onMouseDown={
                                                        isSelectable
                                                            ? onRowMouseDown
                                                            : undefined
                                                    }
                                                    onContextMenuCapture={
                                                        isSelectable
                                                            ? (event) =>
                                                                  onRowContextMenu(
                                                                      event,
                                                                      account
                                                                  )
                                                            : undefined
                                                    }
                                                    onClick={
                                                        isSelectable
                                                            ? (event) =>
                                                                  onRowClick(
                                                                      event,
                                                                      account
                                                                  )
                                                            : undefined
                                                    }
                                                >
                                                    <TableCell>
                                                        <GameBadge
                                                            game={account.game}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        <TextLabel
                                                            content={
                                                                account.username
                                                            }
                                                            showCopyButton
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextLabel
                                                            content={
                                                                account.password
                                                            }
                                                            showCopyButton
                                                            showEyeButton
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <ExpandableNotes
                                                            content={
                                                                account.notes ??
                                                                ""
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {isContextMenuOpen ? (
                                                            <DropdownMenuTrigger
                                                                asChild
                                                            >
                                                                <span
                                                                    aria-hidden
                                                                    className="fixed h-0 w-0 pointer-events-none"
                                                                    style={{
                                                                        left:
                                                                            contextMenuPositionRef
                                                                                .current
                                                                                ?.x ??
                                                                            0,
                                                                        top:
                                                                            contextMenuPositionRef
                                                                                .current
                                                                                ?.y ??
                                                                            0,
                                                                    }}
                                                                />
                                                            </DropdownMenuTrigger>
                                                        ) : null}
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    onToggleDetails(
                                                                        detailKey
                                                                    )
                                                                }
                                                                className="h-8 w-8"
                                                                aria-label={
                                                                    detailsLabel
                                                                }
                                                                data-no-row-select
                                                            >
                                                                <DetailsIcon className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    onEdit(
                                                                        account
                                                                    )
                                                                }
                                                                className="h-8 w-8"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                <span className="sr-only">
                                                                    Edit
                                                                </span>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    onDelete(
                                                                        account
                                                                    )
                                                                }
                                                                className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                <span className="sr-only">
                                                                    Delete
                                                                </span>
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {isSelectable ? (
                                                    <SelectionMenuContent
                                                        align="start"
                                                        className="w-56"
                                                        groups={groups}
                                                        selectedCount={
                                                            selectedCount
                                                        }
                                                        onBulkMove={onBulkMove}
                                                        onBulkDelete={
                                                            onBulkDelete
                                                        }
                                                        onClearSelection={
                                                            onClearSelection
                                                        }
                                                    />
                                                ) : null}
                                            </DropdownMenu>
                                            {isExpanded && (
                                                <TableRow className="bg-muted/20">
                                                    <TableCell
                                                        colSpan={5}
                                                        className="pt-0 pb-4"
                                                    >
                                                        <div className="rounded-md border border-muted/40 bg-muted/10 p-4">
                                                            <AccountDetails
                                                                account={account}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </Fragment>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
