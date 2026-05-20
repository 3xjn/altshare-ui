import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { mantineTheme } from "@/theme/mantine-theme";

import { GameBadge } from "./GameBadge";

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

describe("GameBadge", () => {
    it("renders the configured icon for League of Legends", () => {
        renderWithMantine(<GameBadge game="League of Legends" />);

        expect(screen.getByText("League of Legends")).toBeInTheDocument();
        expect(
            screen.getByRole("img", { name: "League of Legends" })
        ).toHaveAttribute("src", "./images/league-of-legends.png");
    });

    it("renders the configured icon when the game has one", () => {
        renderWithMantine(<GameBadge game="Marvel Rivals" />);

        expect(screen.getByText("Marvel Rivals")).toBeInTheDocument();
        expect(screen.getByRole("img", { name: "Marvel Rivals" })).toHaveAttribute(
            "src",
            "./images/marvel-rivals.png"
        );
    });

    it("renders fallback initials when the game has no icon", () => {
        renderWithMantine(<GameBadge game="Roblox" />);

        expect(screen.getByText("Roblox")).toBeInTheDocument();
        expect(screen.getByText("R")).toBeInTheDocument();
        expect(screen.queryByRole("img", { name: "Roblox" })).not.toBeInTheDocument();
    });

    it("treats custom games as first-class labels instead of collapsing them to None", () => {
        renderWithMantine(<GameBadge game="Fortnite" />);

        expect(screen.getByText("Fortnite")).toBeInTheDocument();
        expect(screen.getByText("F")).toBeInTheDocument();
        expect(screen.queryByRole("img", { name: "Fortnite" })).not.toBeInTheDocument();
    });
});
