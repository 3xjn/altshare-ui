import { normalizeStoredGame } from "@/config/games";

export type AccountMutationInput = {
    username: string;
    password: string;
    notes: string;
    game?: string;
    gameData?: Record<string, string>;
    groupId?: string;
};

export function parseAccountMutationFormData(
    formData: FormData
): AccountMutationInput {
    const normalizedGame = normalizeStoredGame(formData.get("game") as string);
    const gameDataEntries = Array.from(formData.entries()).filter(
        ([key, value]) => key.startsWith("gameField__") && value
    );
    const gameData = gameDataEntries.reduce<Record<string, string>>(
        (acc, [key, value]) => {
            const fieldKey = key.replace("gameField__", "");
            acc[fieldKey] = String(value);
            return acc;
        },
        {}
    );

    return {
        username: formData.get("username") as string,
        password: formData.get("password") as string,
        notes: (formData.get("notes") as string) || "",
        game: normalizedGame,
        gameData: Object.keys(gameData).length > 0 ? gameData : undefined,
        groupId: (formData.get("groupId") as string) || undefined,
    };
}
