import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";

import { mantineTheme } from "@/theme/mantine-theme";

import { NewGroupModal } from "./NewGroupModal";

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

describe("NewGroupModal", () => {
    it("keeps group creation and cancel flows controlled", () => {
        const onNameChange = vi.fn();
        const onOpenChange = vi.fn();
        const onSubmit = vi.fn();

        renderWithMantine(
            <NewGroupModal
                open
                name="Friends"
                onNameChange={onNameChange}
                onOpenChange={onOpenChange}
                onSubmit={onSubmit}
            />
        );

        fireEvent.change(screen.getByLabelText("Group name"), {
            target: { value: "Raid Team" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Create group" }));
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onNameChange).toHaveBeenCalledWith("Raid Team");
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
