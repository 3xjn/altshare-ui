import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState, type MutableRefObject } from "react";
import { describe, expect, it, vi } from "vitest";

import type { AccountSection } from "@/components/accounts/types";
import type { Account, AccountGroup } from "@/types/account";
import { mantineTheme } from "@/theme/mantine-theme";

import { AccountsTable } from "./AccountsTable";

if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        }),
    });
}

if (!window.ResizeObserver) {
    class ResizeObserver {
        observe() {}

        unobserve() {}

        disconnect() {}
    }

    Object.defineProperty(window, "ResizeObserver", {
        writable: true,
        value: ResizeObserver,
    });
}

if (!globalThis.ResizeObserver) {
    Object.defineProperty(globalThis, "ResizeObserver", {
        writable: true,
        value: window.ResizeObserver,
    });
}

function renderWithMantine(ui: React.ReactNode) {
    return render(
        <MantineProvider theme={mantineTheme} forceColorScheme="light">
            {ui}
        </MantineProvider>
    );
}

const groups: AccountGroup[] = [
    {
        id: "personal",
        name: "Personal",
        usesMasterKey: true,
    },
    {
        id: "shared-group",
        name: "Shared Group",
        usesMasterKey: false,
    },
];

const account: Account = {
    id: "account-1",
    username: "alt-user",
    password: "secret",
    notes: "primary note",
    game: "Steam",
    isLoadingRank: false,
    groupId: "personal",
};

const secondAccount: Account = {
    id: "account-2",
    username: "second-user",
    password: "secret-2",
    notes: "secondary note",
    game: "Steam",
    isLoadingRank: false,
    groupId: "personal",
};

const sections: AccountSection[] = [
    {
        id: "personal",
        name: "Personal",
        accounts: [account, secondAccount],
    },
];

function createAccountsTableProps(
    overrides: Partial<React.ComponentProps<typeof AccountsTable>> = {}
): React.ComponentProps<typeof AccountsTable> {
    return {
        isLoading: false,
        sections,
    totalAccounts: sections[0].accounts.length,
        groups,
        selectedAccountIds: new Set<string>(),
        contextMenuAccountId: null,
        contextMenuPositionRef: {
            current: null,
        } as MutableRefObject<{ x: number; y: number } | null>,
        selectedCount: 0,
        onRowMouseDown: vi.fn(),
        onRowClick: vi.fn(),
        onRowContextMenu: vi.fn(),
        onContextMenuOpenChange: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
        onBulkMove: vi.fn(),
        onBulkDelete: vi.fn(),
        onClearSelection: vi.fn(),
        ...overrides,
    };
}

type AccountsTableHarnessProps = {
    onBulkMove: (groupId: string) => void;
    initialSelection?: string[];
};

function AccountsTableHarness({ onBulkMove, initialSelection = [] }: AccountsTableHarnessProps) {
    const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(
        () => new Set(initialSelection)
    );
    const [contextMenuAccountId, setContextMenuAccountId] = useState<
        string | null
    >(null);
    const contextMenuPositionRef = useRef<{ x: number; y: number } | null>(
        null
    );

    return (
        <AccountsTable
            isLoading={false}
            sections={sections}
            totalAccounts={sections[0].accounts.length}
            groups={groups}
            selectedAccountIds={selectedAccountIds}
            contextMenuAccountId={contextMenuAccountId}
            contextMenuPositionRef={contextMenuPositionRef}
            selectedCount={selectedAccountIds.size}
            onRowMouseDown={vi.fn()}
            onRowClick={vi.fn()}
            onRowContextMenu={(event, nextAccount) => {
                event.preventDefault();
                contextMenuPositionRef.current = {
                    x: event.clientX,
                    y: event.clientY,
                };
                setSelectedAccountIds((prev) => {
                    if (prev.has(nextAccount.id)) {
                        return prev;
                    }
                    return new Set([nextAccount.id]);
                });
                setContextMenuAccountId(nextAccount.id);
            }}
            onContextMenuOpenChange={(open, accountId) => {
                if (open || contextMenuAccountId !== accountId) {
                    return;
                }

                contextMenuPositionRef.current = null;
                setContextMenuAccountId(null);
            }}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onBulkMove={onBulkMove}
            onBulkDelete={vi.fn()}
            onClearSelection={() => {
                setSelectedAccountIds(new Set());
                contextMenuPositionRef.current = null;
                setContextMenuAccountId(null);
            }}
        />
    );
}

describe("AccountsTable", () => {
    it("renders the loading state inside the table surface", () => {
        renderWithMantine(
            <AccountsTable
                {...createAccountsTableProps({
                    isLoading: true,
                    sections: [],
                    totalAccounts: 0,
                })}
            />
        );

        expect(screen.getByText("Loading accounts...")).toBeInTheDocument();
    });

    it("renders an actionable empty state when there are no accounts", () => {
        const onAddAccount = vi.fn();

        renderWithMantine(
            <AccountsTable
                {...createAccountsTableProps({
                    sections: [],
                    totalAccounts: 0,
                    onAddAccount,
                })}
            />
        );

        expect(screen.getByText("No accounts yet")).toBeInTheDocument();
        expect(
            screen.getByText("Save your first login here so it is ready to share with your group.")
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole("button", { name: "Add your first account" })
        );

        expect(onAddAccount).toHaveBeenCalledTimes(1);
    });

    it("opens the single-row context menu on right click for an unselected row", async () => {
        const onBulkMove = vi.fn();

        renderWithMantine(<AccountsTableHarness onBulkMove={onBulkMove} />);

        const row = screen.getByText("alt-user").closest("tr");

        expect(row).not.toBeNull();

        fireEvent.contextMenu(row as HTMLTableRowElement, {
            clientX: 120,
            clientY: 240,
        });

        await waitFor(() => {
            expect(screen.getByRole("menuitem", { name: "Edit account" })).toBeInTheDocument();
        });

        expect(row).toHaveAttribute("aria-selected", "true");
        expect(await screen.findByText("Delete account")).toBeInTheDocument();

        fireEvent.mouseDown(document.body);

        await waitFor(() => {
            expect(screen.queryByRole("menuitem", { name: "Edit account" })).not.toBeInTheDocument();
        });
    });

    it("opens the bulk context menu when right-clicking inside an existing multi-selection", async () => {
        const onBulkMove = vi.fn();

        renderWithMantine(
            <AccountsTableHarness onBulkMove={onBulkMove} initialSelection={["account-1", "account-2"]} />
        );

        const row = screen.getByText("alt-user").closest("tr");

        expect(row).not.toBeNull();

        fireEvent.contextMenu(row as HTMLTableRowElement, {
            clientX: 120,
            clientY: 240,
        });

        await waitFor(() => {
            expect(screen.getByText("2 selected")).toBeInTheDocument();
        });

        const moveToGroupItem = await screen.findByText("Move to group");

        fireEvent.mouseEnter(moveToGroupItem);
        fireEvent.click(moveToGroupItem);

        fireEvent.click(await screen.findByText("Shared Group"));

        expect(onBulkMove).toHaveBeenCalledWith("shared-group");

        fireEvent.mouseDown(document.body);

        await waitFor(() => {
            expect(
                screen.queryByRole("menuitem", { name: "Delete selected" })
            ).not.toBeInTheDocument();
        });
    });
});
