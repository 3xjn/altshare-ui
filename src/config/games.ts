export type GameId = "None" | "Marvel Rivals" | "Roblox";

export type GameField = {
    id: string;
    label: string;
    type?: "text" | "password";
    placeholder?: string;
    helperText?: string;
    inputMode?: "numeric" | "text";
};

export type GameConfig = {
    id: GameId;
    label: string;
    icon?: string;
    usernameLabel?: string;
    fields?: GameField[];
};

export const GAME_CATALOG: GameConfig[] = [
    {
        id: "None",
        label: "None",
    },
    {
        id: "Marvel Rivals",
        label: "Marvel Rivals",
        icon: "./images/marvel-rivals.png",
        usernameLabel: "Username (IGN)",
    },
    {
        id: "Roblox",
        label: "Roblox",
        fields: [
            {
                id: "pin",
                label: "PIN",
                type: "password",
                placeholder: "4-8 digits",
                helperText: "Optional but recommended.",
                inputMode: "numeric",
            },
        ],
    },
];

export const getGameConfig = (game?: string | null): GameConfig => {
    const normalized = game && game !== "None" ? game : "None";
    const match = GAME_CATALOG.find((item) => item.id === normalized);
    if (match) {
        return match;
    }

    return {
        id: "None",
        label: normalized || "None",
    };
};
