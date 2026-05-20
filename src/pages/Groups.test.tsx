import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAccountStore } from "@/stores/AccountStore";
import { mantineTheme } from "@/theme/mantine-theme";
import { Groups } from "./Groups";

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
    useToast: () => ({ toast: vi.fn() }),
}));

type MockStore = ReturnType<typeof createStore>;

function createStore() {
    return {
        isAuthenticated: true,
        groups: [
            { id: "personal", name: "Personal", usesMasterKey: true },
            { id: "speedrunners", name: "Speedrunners", usesMasterKey: false },
        ],
        decryptedAccounts: [
            {
                id: "account-1",
                username: "alt-user",
                password: "secret",
                isLoadingRank: false,
                groupId: "speedrunners",
            },
        ],
        currentPassword: "password",
        loadGroups: vi.fn(async () => {}),
        loadAccounts: vi.fn(async () => {}),
        createGroup: vi.fn(async () => ({ id: "new-group", name: "New", usesMasterKey: false })),
        renameGroup: vi.fn(async () => ({ id: "speedrunners", name: "Renamed", usesMasterKey: false })),
        deleteGroup: vi.fn(async () => true),
    };
}

function renderGroups() {
    return render(
        <MantineProvider theme={mantineTheme} forceColorScheme="light">
            <MemoryRouter initialEntries={["/groups"]}>
                <Routes>
                    <Route path="/groups" element={<Groups />} />
                    <Route path="/login" element={<div>login</div>} />
                </Routes>
            </MemoryRouter>
        </MantineProvider>
    );
}

describe("Groups page", () => {
    const mockedUseAccountStore = vi.mocked(useAccountStore);
    let store: MockStore;

    beforeEach(() => {
        store = createStore();
        mockedUseAccountStore.mockImplementation(() => store);
    });

    it("renders groups as a compact list with rename next to the group title", () => {
        renderGroups();

        const list = screen.getByRole("list", { name: "Groups" });
        expect(within(list).getAllByRole("listitem")).toHaveLength(2);

        const titleRow = screen.getByTestId("group-title-speedrunners");
        expect(within(titleRow).getByText("Speedrunners")).toBeInTheDocument();

        const renameButton = within(titleRow).getByRole("button", {
            name: "Rename Speedrunners",
        });
        expect(renameButton.querySelector("svg")).not.toBeNull();
    });
});
