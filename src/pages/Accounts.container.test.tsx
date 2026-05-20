import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAccountStore } from "@/stores/AccountStore";
import { mantineTheme } from "@/theme/mantine-theme";
import { Accounts } from "./Accounts";

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

vi.mock("@/stores/AccountStore", () => ({
    useAccountStore: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({
        toast: vi.fn(),
        dismiss: vi.fn(),
        toasts: [],
    }),
}));

vi.mock("@/components/accounts/AccountsHeader", () => ({
    AccountsHeader: () => <div data-testid="accounts-header">Accounts Header</div>,
}));

vi.mock("@/components/accounts/AccountsToolbar", () => ({
    AccountsToolbar: () => <div data-testid="accounts-toolbar">Accounts Toolbar</div>,
}));

vi.mock("@/components/accounts/AccountsTable", () => ({
    AccountsTable: () => <div data-testid="accounts-table">Accounts Table</div>,
}));

vi.mock("@/components/AddAccountDialog", () => ({
    default: () => null,
}));

vi.mock("@/components/accounts/NewGroupModal", () => ({
    NewGroupModal: () => null,
}));

vi.mock("@/components/accounts/InviteModal", () => ({
    InviteModal: () => null,
}));

vi.mock("@/components/accounts/SharingModal", () => ({
    SharingModal: () => null,
}));

vi.mock("@/components/PasswordPrompt", () => ({
    PasswordPrompt: () => null,
}));

vi.mock("@/components/accounts/useAccountSelection", () => ({
    useAccountSelection: () => ({
        selectedAccountIds: new Set<string>(),
        selectedCount: 0,
        contextMenuAccountId: null,
        contextMenuPositionRef: { current: null },
        handleRowMouseDown: vi.fn(),
        handleRowClick: vi.fn(),
        handleRowContextMenu: vi.fn(),
        handleContextMenuOpenChange: vi.fn(),
        clearSelection: vi.fn(),
        handleBulkMove: vi.fn(),
        handleBulkDelete: vi.fn(),
    }),
}));

type MockStore = {
    isAuthenticated: boolean;
    currentPassword: string | null;
    setCurrentPassword: (password: string) => void;
    encryptedMasterKey: string | null;
    groups: Array<{ id: string; name: string; usesMasterKey: boolean }>;
    groupKeys: Record<string, string>;
    defaultGroupId: string | null;
    decryptedAccounts: Array<{
        id: string;
        username: string;
        password: string;
        isLoadingRank: boolean;
        isShared?: boolean;
        groupId?: string;
    }>;
    loadGroups: () => Promise<void>;
    loadAccounts: () => Promise<void>;
    loadSharedAccounts: () => Promise<void>;
    createGroup: (name: string) => Promise<{ id: string } | null>;
    getRanks: () => Promise<void>;
    logout: () => void;
};

function LocationProbe({ testId }: { testId: string }) {
    const location = useLocation();
    return <div data-testid={testId}>{`${location.pathname}${location.search}`}</div>;
}

function renderAccounts(initialEntry: string) {
    return render(
        <MantineProvider theme={mantineTheme} forceColorScheme="light">
            <MemoryRouter initialEntries={[initialEntry]}>
                <Routes>
                    <Route path="/accounts" element={<Accounts />} />
                    <Route
                        path="/login"
                        element={<LocationProbe testId="login-route" />}
                    />
                </Routes>
            </MemoryRouter>
        </MantineProvider>
    );
}

describe("Accounts container", () => {
    const mockedUseAccountStore = vi.mocked(useAccountStore);

    let store: MockStore;

    beforeEach(() => {
        store = {
            isAuthenticated: true,
            currentPassword: null,
            setCurrentPassword: vi.fn(),
            encryptedMasterKey: null,
            groups: [],
            groupKeys: {},
            defaultGroupId: null,
            decryptedAccounts: [],
            loadGroups: vi.fn(async () => {}),
            loadAccounts: vi.fn(async () => {}),
            loadSharedAccounts: vi.fn(async () => {}),
            createGroup: vi.fn(async () => ({ id: "group-1" })),
            getRanks: vi.fn(async () => {}),
            logout: vi.fn(),
        };

        mockedUseAccountStore.mockImplementation(() => store);
    });

    it("redirects unauthenticated users to login", async () => {
        store.isAuthenticated = false;

        renderAccounts("/accounts");

        await waitFor(() => {
            expect(screen.getByTestId("login-route")).toHaveTextContent("/login");
        });
    });

    it("keeps rendering in test mode even when unauthenticated", async () => {
        store.isAuthenticated = false;

        renderAccounts("/accounts?test=true");

        await waitFor(() => {
            expect(screen.getByTestId("accounts-header")).toBeInTheDocument();
        });
    });
});
