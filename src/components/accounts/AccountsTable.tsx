import {
    ActionIcon,
    Button,
    Center,
    Group,
    Loader,
    Menu,
    ScrollArea,
    Table,
    Text,
    alpha,
    useComputedColorScheme,
    useMantineTheme,
} from "@mantine/core";
import { Fragment, type MutableRefObject } from "react";
import { TextLabel } from "@/components/ui/text-label";
import { ExpandableNotes } from "@/components/ui/expandable-notes";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { Account, AccountGroup } from "@/types/account";
import type { AccountSection } from "@/components/accounts/types";
import { SelectionMenuContent } from "@/components/accounts/SelectionMenuContent";
import { GameBadge } from "@/components/accounts/GameBadge";
import { AccountRowMenu } from "@/components/accounts/AccountRowMenu";
import { AccountRowMenuItems } from "@/components/accounts/AccountRowMenuItems";

type AccountsTableProps = {
    isLoading: boolean;
    sections: AccountSection[];
    totalAccounts: number;
    groups: AccountGroup[];
    selectedAccountIds: Set<string>;
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
    onEdit: (account: Account) => void;
    onDelete: (account: Account) => void;
    onBulkMove: (groupId: string) => void;
    onBulkDelete: () => void;
    onClearSelection: () => void;
    onToggleSection?: (sectionId: string) => void;
    onAddAccount?: () => void;
};

export function AccountsTable({
    isLoading,
    sections,
    totalAccounts,
    groups,
    selectedAccountIds,
    contextMenuAccountId,
    contextMenuPositionRef,
    selectedCount,
    onRowMouseDown,
    onRowClick,
    onRowContextMenu,
    onContextMenuOpenChange,
    onEdit,
    onDelete,
    onBulkMove,
    onBulkDelete,
    onClearSelection,
    onToggleSection,
    onAddAccount,
}: AccountsTableProps) {
    const theme = useMantineTheme();
    const colorScheme = useComputedColorScheme("light", {
        getInitialValueInEffect: false,
    });
    const isContextMenuOpen = contextMenuAccountId !== null;
    const columnCount = 5;
    const contextMenuAccount =
        contextMenuAccountId !== null
            ? sections
                  .flatMap((section) => section.accounts)
                  .find((account) => account.id === contextMenuAccountId) ?? null
            : null;
    const tableTone =
        colorScheme === "dark"
            ? {
                  section: alpha(theme.white, 0.04),
                  hover: alpha(theme.white, 0.035),
                  selected: alpha(theme.colors.blue[5], 0.14),
                  selectedBorder: alpha(theme.colors.blue[4], 0.24),
                  header: theme.colors.gray[4],
                  sectionText: theme.colors.gray[0],
                  border: alpha(theme.white, 0.08),
              }
            : {
                  section: alpha(theme.colors.gray[2], 0.55),
                  hover: alpha(theme.colors.gray[3], 0.22),
                  selected: alpha(theme.colors.blue[1], 0.9),
                  selectedBorder: alpha(theme.colors.blue[5], 0.18),
                  header: theme.colors.gray[6],
                  sectionText: theme.colors.dark[7],
                  border: alpha(theme.black, 0.06),
              };

    const shouldIgnoreRowSelection = (event: React.MouseEvent) => {
        const target = event.target as HTMLElement | null;
        return Boolean(
            target?.closest(
                "button, a, input, textarea, select, [data-no-row-select='true']"
            )
        );
    };

    return (
        <div className="px-4 sm:px-6">
            <Menu
                opened={isContextMenuOpen}
                onChange={(open) =>
                    contextMenuAccountId
                        ? onContextMenuOpenChange(open, contextMenuAccountId)
                        : undefined
                }
                position="bottom-start"
                shadow="md"
                width={224}
                offset={4}
                withinPortal
            >
                <Menu.Target>
                    <span
                        aria-hidden
                        className="pointer-events-none fixed h-0 w-0"
                        style={{
                            left: contextMenuPositionRef.current?.x ?? -9999,
                            top: contextMenuPositionRef.current?.y ?? -9999,
                        }}
                    />
                </Menu.Target>
                {selectedCount > 1 ? (
                    <SelectionMenuContent
                        groups={groups}
                        selectedCount={selectedCount}
                        onBulkMove={onBulkMove}
                        onBulkDelete={onBulkDelete}
                        onClearSelection={onClearSelection}
                    />
                ) : (
                    <Menu.Dropdown>
                        {contextMenuAccount ? (
                            <AccountRowMenuItems
                                account={contextMenuAccount}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ) : null}
                    </Menu.Dropdown>
                )}
            </Menu>
            <ScrollArea type="auto" offsetScrollbars>
                <Table
                    className="min-w-[720px] w-full select-none text-sm"
                    verticalSpacing="xs"
                >
                    <Table.Thead className="[&_tr]:border-b">
                        <Table.Tr>
                            <Table.Th
                                className="h-10 px-2 text-left align-middle font-medium"
                                c={tableTone.header}
                                style={{ minWidth: "8rem", width: "16%" }}
                            >
                                Game
                            </Table.Th>
                            <Table.Th
                                className="h-10 px-2 text-left align-middle font-medium"
                                c={tableTone.header}
                                style={{ minWidth: "10rem", width: "22%" }}
                            >
                                Username
                            </Table.Th>
                            {/*<Table.Th className="h-10 w-[220px] px-2 text-left align-middle font-medium text-muted-foreground">Rank</Table.Th>*/}
                            <Table.Th
                                className="h-10 px-2 text-left align-middle font-medium"
                                c={tableTone.header}
                                style={{ minWidth: "10rem", width: "22%" }}
                            >
                                Password
                            </Table.Th>
                            <Table.Th className="h-10 px-2 text-left align-middle font-medium" c={tableTone.header}>
                                Notes
                            </Table.Th>
                            <Table.Th
                                className="h-10 px-2 text-right align-middle font-medium"
                                c={tableTone.header}
                                style={{ minWidth: "3rem", width: "1%" }}
                            />
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody className="[&_tr:last-child]:border-0">
                        {isLoading ? (
                            <Table.Tr>
                                <Table.Td colSpan={columnCount} className="h-32 p-2 align-middle">
                                    <Center>
                                        <Group gap="sm">
                                            <Loader type="oval" size="sm" />
                                            <Text size="sm" c="dimmed">
                                                Loading accounts...
                                            </Text>
                                        </Group>
                                    </Center>
                                </Table.Td>
                            </Table.Tr>
                        ) : totalAccounts === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={columnCount} className="h-32 p-2 align-middle">
                                    <Center>
                                        <div className="space-y-3 text-center">
                                            <Text fw={500}>No accounts yet</Text>
                                            <Text size="sm" c="dimmed">
                                                Save your first login here so it is ready to share with your group.
                                            </Text>
                                            {onAddAccount ? (
                                                <Button
                                                    onClick={onAddAccount}
                                                    leftSection={<Plus className="h-4 w-4" />}
                                                >
                                                    Add your first account
                                                </Button>
                                            ) : null}
                                        </div>
                                    </Center>
                                </Table.Td>
                            </Table.Tr>
                        ) : (
                            sections.map((section) => (
                                <Fragment key={`section-${section.id}`}>
                                    <Table.Tr className="border-b" style={{ backgroundColor: tableTone.section, borderColor: tableTone.border }}>
                                        <Table.Td
                                            colSpan={columnCount}
                                            className="p-2 align-middle text-sm font-semibold"
                                            c={tableTone.sectionText}
                                        >
                                            <Group justify="space-between" wrap="nowrap" gap="sm">
                                                <Group gap="sm" wrap="nowrap">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        size="sm"
                                                        aria-label={section.collapsed ? `Expand ${section.name}` : `Collapse ${section.name}`}
                                                        onClick={() => onToggleSection?.(section.id)}
                                                        data-no-row-select="true"
                                                    >
                                                        {section.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                                    </ActionIcon>
                                                    <Text inherit>{section.name}</Text>
                                                </Group>
                                                <Text size="xs" c="dimmed">
                                                    {section.totalCount ?? section.accounts.length} accounts
                                                </Text>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                    {!section.collapsed && section.accounts.map((account, index) => {
                                        const isSelectable =
                                            !account.isShared && !!account.id;
                                        const isSelected =
                                            isSelectable &&
                                            selectedAccountIds.has(account.id);
                                        const rowKey = account.id
                                            ? account.id
                                            : `${section.id}-${index}`;
                                        const rowClassName = [
                                            "border-b group",
                                            "select-none",
                                            isSelectable ? "cursor-pointer" : "",
                                        ]
                                            .filter(Boolean)
                                            .join(" ");

                                        return (
                                            <Fragment key={rowKey}>
                                                <Table.Tr
                                                    className={rowClassName}
                                                    style={{
                                                        borderColor: tableTone.border,
                                                        backgroundColor: isSelected
                                                            ? tableTone.selected
                                                            : undefined,
                                                        boxShadow: isSelected
                                                            ? `inset 3px 0 0 ${tableTone.selectedBorder}`
                                                            : undefined,
                                                    }}
                                                    aria-selected={isSelected}
                                                    data-state={
                                                        isSelected
                                                            ? "selected"
                                                            : undefined
                                                    }
                                                    onMouseDown={
                                                        isSelectable
                                                            ? (event) => {
                                                                  if (!shouldIgnoreRowSelection(event)) {
                                                                      onRowMouseDown(event);
                                                                  }
                                                              }
                                                            : undefined
                                                    }
                                                    onContextMenuCapture={
                                                        isSelectable
                                                            ? (event) => {
                                                                  if (!shouldIgnoreRowSelection(event)) {
                                                                      onRowContextMenu(
                                                                          event,
                                                                          account
                                                                      );
                                                                  }
                                                              }
                                                            : undefined
                                                    }
                                                    onClick={
                                                        isSelectable
                                                            ? (event) => {
                                                                  if (!shouldIgnoreRowSelection(event)) {
                                                                      onRowClick(
                                                                          event,
                                                                          account
                                                                      );
                                                                  }
                                                              }
                                                            : undefined
                                                    }
                                                    onMouseEnter={(event) => {
                                                        if (!isSelected) {
                                                            event.currentTarget.style.backgroundColor =
                                                                tableTone.hover;
                                                        }
                                                    }}
                                                    onMouseLeave={(event) => {
                                                        event.currentTarget.style.backgroundColor =
                                                            isSelected
                                                                ? tableTone.selected
                                                                : "transparent";
                                                    }}
                                                >
                                                    <Table.Td className="p-2 pl-6 align-middle">
                                                        <GameBadge
                                                            game={account.game}
                                                        />
                                                    </Table.Td>
                                                    <Table.Td className="p-2 align-middle font-medium">
                                                        <TextLabel
                                                            content={
                                                                account.username
                                                            }
                                                            showCopyButton
                                                        />
                                                    </Table.Td>
                                                    {/*<Table.Td className="p-2 align-middle">*/}
                                                    {/*    <AccountRank*/}
                                                    {/*        account={account}*/}
                                                    {/*        compact*/}
                                                    {/*    />*/}
                                                    {/*</Table.Td>*/}
                                                    <Table.Td className="p-2 align-middle">
                                                        <TextLabel
                                                            content={
                                                                account.password
                                                            }
                                                            showCopyButton
                                                            showEyeButton
                                                        />
                                                    </Table.Td>
                                                    <Table.Td className="p-2 align-middle">
                                                        <ExpandableNotes
                                                            content={
                                                                account.notes ?? ""
                                                            }
                                                        />
                                                    </Table.Td>
                                                    <Table.Td className="p-2 align-middle text-right">
                                                        <AccountRowMenu
                                                            account={account}
                                                            onEdit={onEdit}
                                                            onDelete={onDelete}
                                                        />
                                                    </Table.Td>
                                                </Table.Tr>
                                            </Fragment>
                                        );
                                    })}
                                </Fragment>
                            ))
                        )}
                    </Table.Tbody>
                </Table>
            </ScrollArea>
        </div>
    );
}
