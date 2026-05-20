import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";

import { mantineTheme } from "@/theme/mantine-theme";

import { PasswordPrompt } from "./PasswordPrompt";

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

describe("PasswordPrompt", () => {
    it("only confirms after password verification succeeds", async () => {
        const onPasswordEntered = vi.fn(async () => {});
        const onConfirm = vi.fn();

        renderWithMantine(
            <PasswordPrompt
                onConfirm={onConfirm}
                onPasswordEntered={onPasswordEntered}
            />
        );

        const passwordInput = screen.getByLabelText("Password");

        fireEvent.change(passwordInput, {
            target: { value: "Password123!" },
        });
        expect(
            screen.getByRole("button", {
                name: "Toggle password visibility",
            })
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Continue" }));

        await waitFor(() => {
            expect(onPasswordEntered).toHaveBeenCalledWith("Password123!");
            expect(onConfirm).toHaveBeenCalledTimes(1);
        });
    });

    it("does not confirm when password verification fails", async () => {
        const error = new Error("bad password");
        const onPasswordEntered = vi.fn(async () => {
            throw error;
        });
        const onConfirm = vi.fn();
        const consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        renderWithMantine(
            <PasswordPrompt
                onConfirm={onConfirm}
                onPasswordEntered={onPasswordEntered}
            />
        );

        fireEvent.change(screen.getByLabelText("Password"), {
            target: { value: "WrongPassword" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Continue" }));

        await waitFor(() => {
            expect(onPasswordEntered).toHaveBeenCalledWith("WrongPassword");
        });

        expect(onConfirm).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Password verification failed:",
            error
        );

        consoleErrorSpy.mockRestore();
    });
});
