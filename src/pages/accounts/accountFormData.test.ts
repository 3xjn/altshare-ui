import { describe, expect, it } from "vitest";

import { parseAccountMutationFormData } from "./accountFormData";

describe("parseAccountMutationFormData", () => {
    it("normalizes empty and None game values away", () => {
        const formData = new FormData();
        formData.set("username", "AltUser");
        formData.set("password", "Password123!");
        formData.set("notes", "");
        formData.set("game", "None");

        expect(parseAccountMutationFormData(formData)).toMatchObject({
            username: "AltUser",
            password: "Password123!",
            notes: "",
            game: undefined,
        });
    });

    it("preserves trimmed custom game names", () => {
        const formData = new FormData();
        formData.set("username", "AltUser");
        formData.set("password", "Password123!");
        formData.set("notes", "Shared account");
        formData.set("game", "  Fortnite  ");

        expect(parseAccountMutationFormData(formData)).toMatchObject({
            username: "AltUser",
            password: "Password123!",
            notes: "Shared account",
            game: "Fortnite",
        });
    });

    it("normalizes trimmed built-in game names without keeping sentinel spacing", () => {
        const formData = new FormData();
        formData.set("username", "AltUser");
        formData.set("password", "Password123!");
        formData.set("notes", "Shared account");
        formData.set("game", "  Marvel Rivals  ");

        expect(parseAccountMutationFormData(formData)).toMatchObject({
            game: "Marvel Rivals",
        });
    });
});
