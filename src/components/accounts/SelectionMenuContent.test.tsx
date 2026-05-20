import { Menu, MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { mantineTheme } from "@/theme/mantine-theme";

import { SelectionMenuContent } from "./SelectionMenuContent";

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

describe("SelectionMenuContent", () => {
    it("renders the selected count and moves accounts into a chosen group", async () => {
        const onBulkMove = vi.fn();

        renderWithMantine(
            <Menu opened withinPortal={false} onChange={vi.fn()}>
                <Menu.Target>
                    <button type="button">Open menu</button>
                </Menu.Target>
                <SelectionMenuContent
                    groups={[
                        {
                            id: "group-a",
                            name: "Group A",
                            usesMasterKey: true,
                        },
                        {
                            id: "group-b",
                            name: "Group B",
                            usesMasterKey: true,
                        },
                    ]}
                    selectedCount={2}
                    onBulkMove={onBulkMove}
                    onBulkDelete={vi.fn()}
                    onClearSelection={vi.fn()}
                />
            </Menu>
        );

        expect(screen.getByText("2 selected")).toBeInTheDocument();

        const moveToGroupItem = screen.getByRole("menuitem", {
            name: "Move to group",
        });

        fireEvent.mouseEnter(moveToGroupItem);
        fireEvent.click(moveToGroupItem);

        const groupItem = await screen.findByRole("menuitem", {
            name: "Group B",
        });

        fireEvent.click(groupItem);

        expect(onBulkMove).toHaveBeenCalledWith("group-b");
    });

    it("keeps destructive and clear actions callable and shows an empty groups state", async () => {
        const onBulkDelete = vi.fn();
        const onClearSelection = vi.fn();

        renderWithMantine(
            <Menu opened withinPortal={false} onChange={vi.fn()}>
                <Menu.Target>
                    <button type="button">Open menu</button>
                </Menu.Target>
                <SelectionMenuContent
                    groups={[]}
                    selectedCount={1}
                    onBulkMove={vi.fn()}
                    onBulkDelete={onBulkDelete}
                    onClearSelection={onClearSelection}
                />
            </Menu>
        );

        const moveToGroupItem = screen.getByRole("menuitem", {
            name: "Move to group",
        });

        fireEvent.mouseEnter(moveToGroupItem);
        fireEvent.click(moveToGroupItem);

        await waitFor(() => {
            expect(
                screen.getByRole("menuitem", { name: "No groups available" })
            ).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Delete selected"));
        fireEvent.click(screen.getByText("Clear selection"));

        expect(onBulkDelete).toHaveBeenCalledTimes(1);
        expect(onClearSelection).toHaveBeenCalledTimes(1);
    });
});
