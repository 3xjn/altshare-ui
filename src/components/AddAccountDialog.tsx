import "../services/SignalR";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { Stack } from "./ui/stack";
import type { AccountGroup } from "@/stores/AccountStore";
import { GAME_CATALOG, GameId, getGameConfig } from "@/config/games";

interface DefaultValues {
    game?: string;
    username?: string;
    password?: string;
    notes?: string;
    groupId?: string;
    gameData?: Record<string, string>;
}
interface AddAccountDialog {
    open: boolean;
    setOpen: (open: boolean) => void;
    handleSubmit: React.FormEventHandler<HTMLFormElement> | undefined;
    defaultValues?: DefaultValues;
    groups: AccountGroup[];
    defaultGroupId: string | null;
}

export default function AddAccountDialog({
    open,
    setOpen,
    handleSubmit,
    defaultValues,
    groups,
    defaultGroupId,
}: AddAccountDialog) {
    const isEditing = Boolean(defaultValues);
    const [selectedGame, setSelectedGame] = useState<GameId>("None");
    const initialGroupId = useMemo(() => {
        return (
            defaultValues?.groupId ||
            defaultGroupId ||
            groups[0]?.id ||
            ""
        );
    }, [defaultValues?.groupId, defaultGroupId, groups]);

    useEffect(() => {
        const gameConfig = getGameConfig(defaultValues?.game);
        setSelectedGame(gameConfig.id);
    }, [defaultValues?.game]);

    const selectedConfig = getGameConfig(selectedGame);
    const gameFields = selectedConfig.fields ?? [];

    const renderGameIcon = (label: string, icon?: string) => {
        if (icon) {
            return (
                <img
                    className="w-[30px] h-[30px] object-cover rounded-md"
                    src={icon}
                    alt={label}
                />
            );
        }

        const initials = label
            .split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

        return (
            <div className="w-[30px] h-[30px] rounded-md bg-muted text-xs font-semibold text-muted-foreground flex items-center justify-center">
                {initials}
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Update account" : "Add account"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update the account details and save your changes."
                            : "Add your account credentials to be securely stored."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="game">Game</Label>
                            <Select
                                onValueChange={(value) =>
                                    setSelectedGame(value as GameId)
                                }
                                value={selectedGame}
                                name="game"
                            >
                                <SelectTrigger className="w-full py-5">
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    {GAME_CATALOG.map((game) => (
                                        <SelectItem
                                            key={game.id}
                                            className="cursor-pointer"
                                            value={game.id}
                                        >
                                            <Stack
                                                direction="row"
                                                align="center"
                                                spacing="small"
                                            >
                                                {renderGameIcon(
                                                    game.label,
                                                    game.icon
                                                )}
                                                <span>{game.label}</span>
                                            </Stack>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="groupId">Group</Label>
                            <Select
                                name="groupId"
                                defaultValue={initialGroupId}
                            >
                                <SelectTrigger className="w-full py-5">
                                    <SelectValue placeholder="Select a group" />
                                </SelectTrigger>
                                <SelectContent>
                                    {groups.map((group) => (
                                        <SelectItem
                                            key={group.id}
                                            value={group.id}
                                            className="cursor-pointer"
                                        >
                                            {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="username">
                                {selectedConfig.usernameLabel ?? "Username"}
                            </Label>
                            <Input
                                id="username"
                                name="username"
                                defaultValue={defaultValues?.username ?? ""}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                defaultValue={defaultValues?.password ?? ""}
                                required
                                showPasswordToggle
                            />
                        </div>
                        {gameFields.length > 0 && (
                            <div className="space-y-4 rounded-md border border-dashed border-muted-foreground/30 p-3">
                                <div className="text-sm font-medium text-foreground">
                                    Game-specific fields
                                </div>
                                {gameFields.map((field) => (
                                    <div
                                        key={field.id}
                                        className="space-y-2"
                                    >
                                        <Label htmlFor={`gameField-${field.id}`}>
                                            {field.label}
                                        </Label>
                                        <Input
                                            id={`gameField-${field.id}`}
                                            name={`gameField__${field.id}`}
                                            type={field.type ?? "text"}
                                            inputMode={field.inputMode}
                                            defaultValue={
                                                defaultValues?.gameData?.[
                                                    field.id
                                                ] ?? ""
                                            }
                                            placeholder={field.placeholder}
                                            showPasswordToggle={
                                                field.type === "password"
                                            }
                                        />
                                        {field.helperText && (
                                            <p className="text-xs text-muted-foreground">
                                                {field.helperText}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                name="notes"
                                defaultValue={defaultValues?.notes ?? ""}
                                className="min-h-[100px] resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            className="w-full"
                            variant="secondary"
                        >
                            {isEditing ? "Update account" : "Add account"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
