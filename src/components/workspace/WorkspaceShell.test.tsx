import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useTheme } from "@/components/use-theme";
import { mantineTheme } from "@/theme/mantine-theme";
import { WorkspaceShell } from "./WorkspaceShell";

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

vi.mock("@/components/use-theme", () => ({
    useTheme: vi.fn(),
}));

function renderShell() {
    return render(
        <MantineProvider theme={mantineTheme} forceColorScheme="light">
            <MemoryRouter initialEntries={["/accounts"]}>
                <Routes>
                    <Route path="/" element={<WorkspaceShell />}>
                        <Route path="accounts" element={<div>Accounts view</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        </MantineProvider>
    );
}

describe("WorkspaceShell", () => {
    it("keeps theme switching as a sticky icon action in the top bar", () => {
        const setTheme = vi.fn();
        vi.mocked(useTheme).mockReturnValue({
            theme: "light",
            resolvedTheme: "light",
            setTheme,
        });

        renderShell();

        const themeButton = screen.getByRole("button", {
            name: "Switch to dark theme",
        });

        expect(themeButton).toBeInTheDocument();
        fireEvent.click(themeButton);
        expect(setTheme).toHaveBeenCalledWith("dark");
    });
});
