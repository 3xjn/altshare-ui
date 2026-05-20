import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAccountStore } from "@/stores/AccountStore";
import { mantineTheme } from "@/theme/mantine-theme";
import { Account } from "./Account";

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

function renderAccount() {
    return render(
        <MantineProvider theme={mantineTheme} forceColorScheme="light">
            <MemoryRouter initialEntries={["/account"]}>
                <Routes>
                    <Route path="/account" element={<Account />} />
                    <Route path="/login" element={<div>login</div>} />
                </Routes>
            </MemoryRouter>
        </MantineProvider>
    );
}

describe("Account page", () => {
    beforeEach(() => {
        vi.mocked(useAccountStore).mockReturnValue({
            isAuthenticated: true,
            currentEmail: "asher@example.com",
            decryptedAccounts: [
                { id: "account-1", username: "one", password: "secret", isLoadingRank: false },
                { id: "account-2", username: "two", password: "secret", isLoadingRank: false },
                { id: "shared-1", username: "shared", password: "secret", isLoadingRank: false, isShared: true },
            ],
            groups: [
                { id: "personal", name: "Personal", usesMasterKey: true },
                { id: "speedrunners", name: "Speedrunners", usesMasterKey: false },
            ],
            defaultGroupId: "personal",
            logout: vi.fn(),
        } as ReturnType<typeof useAccountStore>);
    });

    it("uses a compact account summary with grouped actions instead of full-width buttons", () => {
        renderAccount();

        expect(screen.getByText("Signed in as asher@example.com")).toBeInTheDocument();
        expect(screen.getByText("2 saved accounts")).toBeInTheDocument();
        expect(screen.getByText("2 groups")).toBeInTheDocument();

        const actions = screen.getByTestId("account-actions");
        expect(within(actions).getByRole("button", { name: "Export data" })).toBeInTheDocument();
        expect(within(actions).getByRole("button", { name: "Log out" })).toBeInTheDocument();
        expect(actions).toHaveAttribute("data-layout", "inline");
    });
});
