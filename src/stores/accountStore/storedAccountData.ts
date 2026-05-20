import type { Account } from "@/types/account";
import { normalizeStoredGame } from "@/config/games";

export type StoredAccountData = {
    username: string;
    password: string;
    notes?: string;
    rank?: string;
    isShared?: boolean;
    game?: string;
    gameData?: Record<string, string>;
};

const isStringRecord = (value: unknown): value is Record<string, string> => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }

    return Object.values(value).every((entry) => typeof entry === "string");
};

export const parseStoredAccountData = (value: string): StoredAccountData | null => {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return null;
    }

    const record = parsed as Record<string, unknown>;
    if (
        typeof record.username !== "string" ||
        typeof record.password !== "string" ||
        record.username.length === 0 ||
        record.password.length === 0
    ) {
        return null;
    }

    if (record.notes !== undefined && typeof record.notes !== "string") {
        return null;
    }

    if (record.rank !== undefined && typeof record.rank !== "string") {
        return null;
    }

    if (record.isShared !== undefined && typeof record.isShared !== "boolean") {
        return null;
    }

    if (record.game !== undefined && typeof record.game !== "string") {
        return null;
    }

    if (record.gameData !== undefined && !isStringRecord(record.gameData)) {
        return null;
    }

    return {
        username: record.username,
        password: record.password,
        notes: typeof record.notes === "string" ? record.notes : undefined,
        rank: typeof record.rank === "string" ? record.rank : undefined,
        isShared:
            typeof record.isShared === "boolean" ? record.isShared : undefined,
        game:
            typeof record.game === "string"
                ? normalizeStoredGame(record.game)
                : undefined,
        gameData: isStringRecord(record.gameData) ? record.gameData : undefined,
    };
};

export const isAccount = (value: Account | null): value is Account => value !== null;
