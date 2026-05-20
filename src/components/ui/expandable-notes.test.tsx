import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mantineTheme } from "@/theme/mantine-theme";

import { ExpandableNotes } from "./expandable-notes";

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

describe("ExpandableNotes", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        writeText.mockClear();
        Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
                writeText,
            },
        });
    });

    it("renders a helpful empty state when notes are blank", () => {
        renderWithMantine(<ExpandableNotes content="   " />);

        expect(
            screen.getByText("No additional notes available")
        ).toBeInTheDocument();
    });

    it("exposes dialog semantics and shows the full note body when opened", async () => {
        renderWithMantine(
            <ExpandableNotes content={"First line\nSecond line"} showCopyButton />
        );

        const trigger = screen.getByRole("button");

        expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
        expect(trigger).toHaveAttribute("aria-expanded", "false");
        expect(screen.getByText("+ more")).toBeInTheDocument();

        fireEvent.click(trigger);

        expect(trigger).toHaveAttribute("aria-expanded", "true");

        await waitFor(() => {
            expect(screen.getByText(/Second line/)).toBeInTheDocument();
        });

        expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    });
});
