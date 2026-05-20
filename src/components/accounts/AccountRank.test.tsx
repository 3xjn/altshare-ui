import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Account } from "@/types/account";
import { mantineTheme } from "@/theme/mantine-theme";

import { AccountRank } from "./AccountRank";

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

function renderWithMantine(ui: React.ReactNode) {
    return render(
        <MantineProvider theme={mantineTheme} forceColorScheme="light">
            {ui}
        </MantineProvider>
    );
}

function createAccount(overrides: Partial<Account> = {}): Account {
    return {
        id: "account-1",
        username: "alt-user",
        password: "secret",
        isLoadingRank: false,
        game: "Marvel Rivals",
        ...overrides,
    };
}

describe("AccountRank", () => {
    it("shows not tracked for games without rank support", () => {
        renderWithMantine(
            <AccountRank account={createAccount({ game: "Roblox" })} />
        );

        expect(screen.getByText("Not tracked")).toBeInTheDocument();
    });

    it("shows loading semantics while rank is being fetched", () => {
        renderWithMantine(
            <AccountRank account={createAccount({ isLoadingRank: true })} />
        );

        expect(screen.getByText("Loading rank...")).toBeInTheDocument();
    });

    it("shows unavailable when Marvel Rivals rank data is missing", () => {
        renderWithMantine(<AccountRank account={createAccount()} />);

        expect(screen.getByText("Unavailable")).toBeInTheDocument();
    });

    it("renders the rank badge and label when rank data exists", () => {
        renderWithMantine(
            <AccountRank account={createAccount({ rank: "Gold III" })} />
        );

        expect(screen.getByText("Gold III")).toBeInTheDocument();
        expect(screen.getByRole("img", { name: "Gold III" })).toHaveAttribute(
            "src",
            "./images/ranks/gold.png"
        );
    });
});
