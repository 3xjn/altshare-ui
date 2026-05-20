import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAccountSelection } from "@/components/accounts/useAccountSelection";
import type { Account } from "@/types/account";
import type { AccountSection } from "@/components/accounts/types";

vi.mock("@/services/AccountApi", () => ({
    accountApi: {
        editAccount: vi.fn(),
        deleteAccount: vi.fn(),
    },
}));

vi.mock("@/utils/encryption", () => ({
    encryptAccountData: vi.fn(),
}));

const accounts: Account[] = [
    {
        id: "a-1",
        username: "alpha",
        password: "pw-1",
        isLoadingRank: false,
    },
    {
        id: "a-2",
        username: "bravo",
        password: "pw-2",
        isLoadingRank: false,
    },
    {
        id: "shared-1",
        username: "shared",
        password: "pw-3",
        isShared: true,
        isLoadingRank: false,
    },
];

const sections: AccountSection[] = [
    {
        id: "section-1",
        name: "Personal",
        accounts,
    },
];

function createMouseEvent(
    overrides: Partial<React.MouseEvent> = {}
): React.MouseEvent {
    return {
        button: 0,
        clientX: 0,
        clientY: 0,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        defaultPrevented: false,
        preventDefault: vi.fn(),
        target: document.createElement("div"),
        ...overrides,
    } as unknown as React.MouseEvent;
}

describe("useAccountSelection", () => {
    const resolveGroupKey = vi.fn();
    const loadAccounts = vi.fn();
    const getRanks = vi.fn();
    const toast = vi.fn();

    beforeEach(() => {
        resolveGroupKey.mockReset();
        loadAccounts.mockReset();
        getRanks.mockReset();
        toast.mockReset();
    });

    it("selects a single non-shared row on click", () => {
        const { result } = renderHook(() =>
            useAccountSelection({
                accounts,
                sections,
                defaultGroupId: "group-1",
                resolveGroupKey,
                loadAccounts,
                getRanks,
                toast,
            })
        );

        act(() => {
            result.current.handleRowClick(createMouseEvent(), accounts[0]);
        });

        expect(Array.from(result.current.selectedAccountIds)).toEqual(["a-1"]);
        expect(result.current.selectedCount).toBe(1);
    });

    it("adds another row to the selection with modifier-click", () => {
        const { result } = renderHook(() =>
            useAccountSelection({
                accounts,
                sections,
                defaultGroupId: "group-1",
                resolveGroupKey,
                loadAccounts,
                getRanks,
                toast,
            })
        );

        act(() => {
            result.current.handleRowClick(createMouseEvent(), accounts[0]);
        });

        act(() => {
            result.current.handleRowClick(createMouseEvent({ ctrlKey: true }), accounts[1]);
        });

        expect(Array.from(result.current.selectedAccountIds)).toEqual([
            "a-1",
            "a-2",
        ]);
    });

    it("selects the target row and stores context menu position on right click", () => {
        const { result } = renderHook(() =>
            useAccountSelection({
                accounts,
                sections,
                defaultGroupId: "group-1",
                resolveGroupKey,
                loadAccounts,
                getRanks,
                toast,
            })
        );

        act(() => {
            result.current.handleRowContextMenu(
                createMouseEvent({ button: 2, clientX: 42, clientY: 24 }),
                accounts[1]
            );
        });

        expect(Array.from(result.current.selectedAccountIds)).toEqual(["a-2"]);
        expect(result.current.contextMenuAccountId).toBe("a-2");
        expect(result.current.contextMenuPositionRef.current).toEqual({
            x: 42,
            y: 24,
        });
    });

    it("keeps the existing multi-selection when right-clicking a selected row", () => {
        const { result } = renderHook(() =>
            useAccountSelection({
                accounts,
                sections,
                defaultGroupId: "group-1",
                resolveGroupKey,
                loadAccounts,
                getRanks,
                toast,
            })
        );

        act(() => {
            result.current.handleRowClick(createMouseEvent(), accounts[0]);
        });

        act(() => {
            result.current.handleRowClick(createMouseEvent({ ctrlKey: true }), accounts[1]);
        });

        act(() => {
            result.current.handleRowContextMenu(
                createMouseEvent({ button: 2, clientX: 10, clientY: 20 }),
                accounts[0]
            );
        });

        expect(Array.from(result.current.selectedAccountIds)).toEqual(["a-1", "a-2"]);
        expect(result.current.contextMenuAccountId).toBe("a-1");
    });

    it("drops invalid selections when available accounts change", () => {
        const { result, rerender } = renderHook(
            ({ hookAccounts, hookSections }: {
                hookAccounts: Account[];
                hookSections: AccountSection[];
            }) =>
                useAccountSelection({
                    accounts: hookAccounts,
                    sections: hookSections,
                    defaultGroupId: "group-1",
                    resolveGroupKey,
                    loadAccounts,
                    getRanks,
                    toast,
                }),
            {
                initialProps: {
                    hookAccounts: accounts,
                    hookSections: sections,
                },
            }
        );

        act(() => {
            result.current.handleRowClick(createMouseEvent(), accounts[0]);
        });

        rerender({
            hookAccounts: accounts.slice(1),
            hookSections: [
                {
                    id: "section-1",
                    name: "Personal",
                    accounts: accounts.slice(1),
                },
            ],
        });

        expect(Array.from(result.current.selectedAccountIds)).toEqual([]);
        expect(result.current.contextMenuAccountId).toBeNull();
    });
});
