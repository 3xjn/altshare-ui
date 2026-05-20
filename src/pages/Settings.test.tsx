import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAccountStore } from "@/stores/AccountStore";
import { mantineTheme } from "@/theme/mantine-theme";
import { ThemeProvider } from "@/components/theme-provider";
import { Settings } from "./Settings";

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

function renderSettings() {
    return render(
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <MantineProvider theme={mantineTheme} forceColorScheme="light">
                <MemoryRouter initialEntries={["/settings"]}>
                    <Routes>
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/login" element={<div>login</div>} />
                    </Routes>
                </MemoryRouter>
            </MantineProvider>
        </ThemeProvider>
    );
}

describe("Settings page", () => {
    beforeEach(() => {
        vi.mocked(useAccountStore).mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useAccountStore>);
    });

    it("does not duplicate the theme toggle now that theme lives in the workspace header", () => {
        renderSettings();

        expect(screen.queryByLabelText("Use dark theme")).not.toBeInTheDocument();
        expect(
            screen.getByText("Theme is available from the top-right workspace control.")
        ).toBeInTheDocument();
    });
});
