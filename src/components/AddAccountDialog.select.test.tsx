import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";

import { mantineTheme } from "@/theme/mantine-theme";

import AddAccountDialog from "./AddAccountDialog";

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

const groups = [
    {
        id: "personal",
        name: "Personal",
        usesMasterKey: true,
        encryptedGroupKey: null,
    },
    {
        id: "shared",
        name: "Shared",
        usesMasterKey: false,
        encryptedGroupKey: null,
    },
];

describe("AddAccountDialog", () => {
    const getPasswordInput = () =>
        document.querySelector('input[name="password"]') as HTMLInputElement;

    const getPinInput = () =>
        document.querySelector('input[name="gameField__pin"]') as HTMLInputElement;

    it("hydrates editing defaults including group and game-specific values", () => {
        renderWithMantine(
            <AddAccountDialog
                open
                setOpen={vi.fn()}
                handleSubmit={vi.fn()}
                groups={groups}
                defaultGroupId="personal"
                defaultValues={{
                    game: "Roblox",
                    username: "Builderman",
                    password: "Secret123!",
                    notes: "Keep safe",
                    groupId: "shared",
                    gameData: {
                        pin: "2468",
                    },
                }}
            />
        );

        expect(screen.getByLabelText("Game")).toHaveValue("Roblox");
        expect(screen.getByLabelText("Group")).toHaveValue("shared");
        expect(screen.getByRole("textbox", { name: /Username/ })).toHaveValue(
            "Builderman"
        );
        expect(getPasswordInput()).toHaveValue("Secret123!");
        expect(screen.getByLabelText("Notes")).toHaveValue("Keep safe");
        expect(getPinInput()).toHaveValue("2468");
        expect(screen.getByText("Optional but recommended.")).toBeInTheDocument();
    });

    it("submits selected game, group, and game-specific values through the form", () => {
        const submittedValues: Record<string, FormDataEntryValue> = {};

        renderWithMantine(
            <AddAccountDialog
                open
                setOpen={vi.fn()}
                handleSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    for (const [key, value] of formData.entries()) {
                        submittedValues[key] = value;
                    }
                }}
                groups={groups}
                defaultGroupId="personal"
            />
        );

        fireEvent.change(screen.getByLabelText("Game"), {
            target: { value: "Roblox" },
        });

        expect(getPinInput()).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("Group"), {
            target: { value: "shared" },
        });
        fireEvent.change(screen.getByRole("textbox", { name: /Username/ }), {
            target: { value: "AltUser" },
        });
        fireEvent.change(getPasswordInput(), {
            target: { value: "Password123!" },
        });
        fireEvent.change(getPinInput(), {
            target: { value: "1357" },
        });
        fireEvent.change(screen.getByLabelText("Notes"), {
            target: { value: "Shared account" },
        });

        fireEvent.click(screen.getByRole("button", { name: "Add account" }));

        expect(submittedValues).toMatchObject({
            game: "Roblox",
            groupId: "shared",
            username: "AltUser",
            password: "Password123!",
            notes: "Shared account",
            gameField__pin: "1357",
        });
    });

    it("includes League of Legends as a selectable game", () => {
        renderWithMantine(
            <AddAccountDialog
                open
                setOpen={vi.fn()}
                handleSubmit={vi.fn()}
                groups={groups}
                defaultGroupId="personal"
            />
        );

        const gameSelect = screen.getByLabelText("Game");

        expect(screen.getByRole("option", { name: "League of Legends" })).toBeInTheDocument();

        fireEvent.change(gameSelect, {
            target: { value: "League of Legends" },
        });

        expect(gameSelect).toHaveValue("League of Legends");
        expect(screen.getByRole("textbox", { name: "Username" })).toBeInTheDocument();
        expect(document.querySelector('input[name="gameField__pin"]')).not.toBeInTheDocument();
    });

    it("lets the user submit a custom game name", async () => {
        const submittedValues: Record<string, FormDataEntryValue> = {};

        renderWithMantine(
            <AddAccountDialog
                open
                setOpen={vi.fn()}
                handleSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    for (const [key, value] of formData.entries()) {
                        submittedValues[key] = value;
                    }
                }}
                groups={groups}
                defaultGroupId="personal"
            />
        );

        fireEvent.change(screen.getByLabelText("Game"), {
            target: { value: "__custom__" },
        });
        await waitFor(() => {
            expect(
                screen.getByPlaceholderText("Enter a game title")
            ).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText("Enter a game title"), {
            target: { value: "Fortnite" },
        });
        fireEvent.change(screen.getByRole("textbox", { name: "Username" }), {
            target: { value: "AltUser" },
        });
        fireEvent.change(getPasswordInput(), {
            target: { value: "Password123!" },
        });

        fireEvent.click(screen.getByRole("button", { name: "Add account" }));

        expect(submittedValues).toMatchObject({
            game: "Fortnite",
            customGameName: "Fortnite",
            username: "AltUser",
            password: "Password123!",
        });
    });

    it("shows existing custom games as reusable options", () => {
        renderWithMantine(
            <AddAccountDialog
                open
                setOpen={vi.fn()}
                handleSubmit={vi.fn()}
                groups={groups}
                defaultGroupId="personal"
                existingGames={["Fortnite"]}
            />
        );

        const gameSelect = screen.getByLabelText("Game");

        expect(screen.getByRole("option", { name: "Fortnite" })).toBeInTheDocument();

        fireEvent.change(gameSelect, {
            target: { value: "Fortnite" },
        });

        expect(gameSelect).toHaveValue("Fortnite");
        expect(screen.queryByLabelText("Custom game name")).not.toBeInTheDocument();
    });

    it("portals the edit modal to the page body so centering is not affected by the account page layout", () => {
        const { container } = renderWithMantine(
            <div data-testid="account-page-panel">
                <AddAccountDialog
                    open
                    setOpen={vi.fn()}
                    handleSubmit={vi.fn()}
                    groups={groups}
                    defaultGroupId="personal"
                    defaultValues={{
                        game: "Roblox",
                        username: "Builderman",
                        password: "Secret123!",
                        groupId: "personal",
                    }}
                />
            </div>
        );

        expect(screen.getByRole("dialog", { name: "Update account" })).toBeInTheDocument();
        expect(within(container).queryByRole("dialog", { name: "Update account" })).not.toBeInTheDocument();
    });

    it("renders the selected game icon as a compact affordance with room inside the select", () => {
        renderWithMantine(
            <AddAccountDialog
                open
                setOpen={vi.fn()}
                handleSubmit={vi.fn()}
                groups={groups}
                defaultGroupId="personal"
                defaultValues={{
                    game: "Roblox",
                    username: "Builderman",
                    password: "Secret123!",
                    groupId: "personal",
                }}
            />
        );

        const gameIcon = screen.getByTestId("game-select-icon");
        const gameSelect = screen.getByLabelText("Game");

        expect(gameIcon).toHaveClass("h-5", "w-5");
        expect(gameSelect.closest(".mantine-Input-wrapper")).toHaveStyle({
            "--input-left-section-width": "calc(2.75rem * var(--mantine-scale))",
        });
    });

    it("uses the controlled open change handler when the modal is closed", () => {
        const setOpen = vi.fn();

        renderWithMantine(
            <AddAccountDialog
                open
                setOpen={setOpen}
                handleSubmit={vi.fn()}
                groups={groups}
                defaultGroupId="personal"
            />
        );

        fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

        expect(setOpen).toHaveBeenCalledWith(false);
    });
});
