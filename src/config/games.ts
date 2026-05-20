export const CUSTOM_GAME_OPTION_ID = "__custom__";

export type BuiltInGameId =
    | "None"
    | "League of Legends"
    | "Marvel Rivals"
    | "Roblox";

export type GameField = {
    id: string;
    label: string;
    type?: "text" | "password";
    placeholder?: string;
    helperText?: string;
    inputMode?: "numeric" | "text";
};

export type GameConfig = {
    id: string;
    label: string;
    icon?: string;
    usernameLabel?: string;
    fields?: GameField[];
    supportsRank?: boolean;
    isCustom?: boolean;
};

export const GAME_CATALOG: GameConfig[] = [
    {
        id: "None",
        label: "None",
    },
    {
        id: "League of Legends",
        label: "League of Legends",
        icon: "./images/league-of-legends.png",
    },
    {
        id: "Marvel Rivals",
        label: "Marvel Rivals",
        icon: "./images/marvel-rivals.png",
        usernameLabel: "Username (IGN)",
        supportsRank: true,
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

const GAME_CONFIG_BY_ID = new Map(GAME_CATALOG.map((game) => [game.id, game]));

export const normalizeGameName = (game?: string | null): string => game?.trim() ?? "";

export const normalizeStoredGame = (game?: string | null): string | undefined => {
    const normalized = normalizeGameName(game);

    if (!normalized || normalized === "None") {
        return undefined;
    }

    return normalized;
};

const createCustomGameConfig = (game: string): GameConfig => ({
    id: game,
    label: game,
    isCustom: true,
});

export const isBuiltInGame = (game?: string | null): game is BuiltInGameId => {
    const normalized = normalizeGameName(game);
    return GAME_CONFIG_BY_ID.has(normalized);
};

export const getGameCatalog = (
    games: readonly (string | null | undefined)[] = []
): GameConfig[] => {
    const customGames = Array.from(
        new Set(
            games
                .map((game) => normalizeGameName(game))
                .filter(
                    (game) => game.length > 0 && game !== "None" && !isBuiltInGame(game)
                )
        )
    )
        .sort((left, right) => left.localeCompare(right))
        .map((game) => createCustomGameConfig(game));

    return [...GAME_CATALOG, ...customGames];
};

export const getGameConfig = (game?: string | null): GameConfig => {
    const resolvedGame = normalizeStoredGame(game) ?? "None";
    const match = GAME_CONFIG_BY_ID.get(resolvedGame);

    if (match) {
        return match;
    }

    return createCustomGameConfig(resolvedGame);
};

export const supportsRankTracking = (game?: string | null): boolean =>
    Boolean(getGameConfig(game).supportsRank);
