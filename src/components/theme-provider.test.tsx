import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "./theme-provider";
import { useTheme } from "./use-theme";

Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

function ThemeProbe() {
    const { resolvedTheme, setTheme, theme } = useTheme();

    return (
        <>
            <div data-testid="theme">{theme ?? "undefined"}</div>
            <div data-testid="resolved-theme">
                {resolvedTheme ?? "undefined"}
            </div>
            <button onClick={() => setTheme("dark")} type="button">
                Set dark theme
            </button>
        </>
    );
}

describe("ThemeProvider", () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.className = "";
    });

    afterEach(() => {
        localStorage.clear();
        document.documentElement.className = "";
    });

    it("preserves the persisted theme across remounts", async () => {
        const { unmount } = render(
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <ThemeProbe />
            </ThemeProvider>
        );

        fireEvent.click(screen.getByRole("button", { name: "Set dark theme" }));

        await waitFor(() => {
            expect(screen.getByTestId("theme")).toHaveTextContent("dark");
        });

        await waitFor(() => {
            expect(screen.getByTestId("resolved-theme")).toHaveTextContent(
                "dark"
            );
        });

        expect(localStorage.getItem("theme")).toBe("dark");
        expect(document.documentElement).toHaveClass("dark");

        unmount();

        render(
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <ThemeProbe />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId("theme")).toHaveTextContent("dark");
        });

        await waitFor(() => {
            expect(screen.getByTestId("resolved-theme")).toHaveTextContent(
                "dark"
            );
        });

        expect(localStorage.getItem("theme")).toBe("dark");
        expect(document.documentElement).toHaveClass("dark");
    });
});
