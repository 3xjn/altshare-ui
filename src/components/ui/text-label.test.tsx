import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mantineTheme } from "@/theme/mantine-theme";

import { TextLabel } from "./text-label";

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

describe("TextLabel", () => {
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

    it("generates unique content ids for repeated labeled instances", () => {
        renderWithMantine(
            <>
                <TextLabel label="Primary password" content="secret-one" showEyeButton />
                <TextLabel label="Secondary password" content="secret-two" showEyeButton />
            </>
        );

        const toggleButtons = screen.getAllByRole("button", {
            name: "Show content",
        });

        expect(toggleButtons).toHaveLength(2);

        const controlledIds = toggleButtons.map((button) =>
            button.getAttribute("aria-controls")
        );

        expect(controlledIds[0]).toBeTruthy();
        expect(controlledIds[1]).toBeTruthy();
        expect(controlledIds[0]).not.toBe(controlledIds[1]);
    });

    it("updates pressed semantics when revealing content and copies the underlying value", async () => {
        renderWithMantine(
            <TextLabel
                label="Password"
                content="super-secret"
                showCopyButton
                showEyeButton
            />
        );

        const toggleButton = screen.getByRole("button", {
            name: "Show content",
        });
        const copyButton = screen.getByRole("button", {
            name: "Copy Password to clipboard",
        });

        expect(toggleButton).toHaveAttribute("aria-pressed", "false");
        expect(screen.getByText("••••••••••")).toBeInTheDocument();

        fireEvent.click(toggleButton);

        expect(toggleButton).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "Hide content" })).toBeInTheDocument();
        expect(screen.getByText("super-secret")).toBeInTheDocument();

        fireEvent.click(copyButton);

        expect(writeText).toHaveBeenCalledWith("super-secret");
    });
});
