import "../services/SignalR";
import {
    Box,
    Button,
    Modal,
    NativeSelect,
    Paper,
    PasswordInput,
    Stack,
    Text,
    TextInput,
    Textarea,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import type { AccountGroup } from "@/types/account";
import {
    CUSTOM_GAME_OPTION_ID,
    getGameCatalog,
    getGameConfig,
    isBuiltInGame,
} from "@/config/games";

interface DefaultValues {
    game?: string;
    username?: string;
    password?: string;
    notes?: string;
    groupId?: string;
    gameData?: Record<string, string>;
}
interface AddAccountDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    handleSubmit: React.FormEventHandler<HTMLFormElement> | undefined;
    formRef?: React.Ref<HTMLFormElement>;
    defaultValues?: DefaultValues;
    groups: AccountGroup[];
    defaultGroupId: string | null;
    existingGames?: string[];
}

export default function AddAccountDialog({
    open,
    setOpen,
    handleSubmit,
    formRef,
    defaultValues,
    groups,
    defaultGroupId,
    existingGames = [],
}: AddAccountDialogProps) {
    const isEditing = Boolean(defaultValues);
    const [selectedGame, setSelectedGame] = useState("None");
    const [customGameName, setCustomGameName] = useState("");
    const [selectedGroupId, setSelectedGroupId] = useState("");
    const initialGroupId = useMemo(() => {
        return (
            defaultValues?.groupId ||
            defaultGroupId ||
            groups[0]?.id ||
            ""
        );
    }, [defaultValues?.groupId, defaultGroupId, groups]);

    const availableGames = useMemo(() => {
        return getGameCatalog([
            ...existingGames,
            defaultValues?.game,
        ]);
    }, [defaultValues?.game, existingGames]);

    useEffect(() => {
        const defaultGame = defaultValues?.game?.trim();

        if (!defaultGame || defaultGame === "None") {
            setSelectedGame("None");
            setCustomGameName("");
            return;
        }

        if (isBuiltInGame(defaultGame)) {
            setSelectedGame(defaultGame);
            setCustomGameName("");
            return;
        }

        setSelectedGame(defaultGame);
        setCustomGameName(defaultGame);
    }, [defaultValues?.game, open]);

    useEffect(() => {
        setSelectedGroupId(initialGroupId);
    }, [initialGroupId, open]);

    const isCreatingCustomGame = selectedGame === CUSTOM_GAME_OPTION_ID;
    const selectedConfig = getGameConfig(
        isCreatingCustomGame ? customGameName : selectedGame
    );
    const gameFields = selectedConfig.fields ?? [];
    const resolvedGameValue = isCreatingCustomGame
        ? customGameName.trim()
        : selectedGame;

    const renderGameIcon = (label: string, icon?: string) => {
        if (icon) {
            return (
                <Box
                    component="img"
                    data-testid="game-select-icon"
                    className="h-5 w-5 rounded object-cover"
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
            <Box
                data-testid="game-select-icon"
                className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-semibold text-muted-foreground"
            >
                {initials}
            </Box>
        );
    };

    const gameSelectIcon =
        selectedConfig.id !== "None"
            ? renderGameIcon(selectedConfig.label, selectedConfig.icon)
            : undefined;

    return (
        <Modal
            opened={open}
            onClose={() => setOpen(false)}
            centered
            size="lg"
            title={isEditing ? "Update account" : "Add account"}
        >
            <Stack gap="md">
                <Text c="dimmed" size="sm">
                    {isEditing
                        ? "Update the account details and save your changes."
                        : "Add your account credentials to be securely stored."}
                </Text>
                <form ref={formRef} onSubmit={handleSubmit}>
                    <Stack gap="md">
                        <NativeSelect
                            label="Game"
                            value={selectedGame}
                            onChange={(event) => {
                                const nextGame = event.currentTarget.value;
                                setSelectedGame(nextGame);
                                if (nextGame === CUSTOM_GAME_OPTION_ID) {
                                    return;
                                }

                                if (nextGame === "None" || isBuiltInGame(nextGame)) {
                                    setCustomGameName("");
                                    return;
                                }

                                setCustomGameName(nextGame);
                            }}
                            data={[
                                ...availableGames.map((game) => ({
                                    value: game.id,
                                    label: game.label,
                                })),
                                {
                                    value: CUSTOM_GAME_OPTION_ID,
                                    label: "Custom game…",
                                },
                            ]}
                            leftSection={gameSelectIcon}
                            leftSectionWidth={44}
                        />
                        <input type="hidden" name="game" value={resolvedGameValue} />
                        {isCreatingCustomGame ? (
                            <TextInput
                                label="Custom game name"
                                name="customGameName"
                                value={customGameName}
                                onChange={(event) =>
                                    setCustomGameName(event.currentTarget.value)
                                }
                                placeholder="Enter a game title"
                                required
                            />
                        ) : null}
                        <NativeSelect
                            label="Group"
                            name="groupId"
                            value={selectedGroupId}
                            onChange={(event) =>
                                setSelectedGroupId(event.currentTarget.value)
                            }
                        >
                            {groups.map((group) => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </NativeSelect>
                        <TextInput
                            label={selectedConfig.usernameLabel ?? "Username"}
                            id="username"
                            name="username"
                            defaultValue={defaultValues?.username ?? ""}
                            required
                        />
                        <PasswordInput
                            label="Password"
                            id="password"
                            name="password"
                            defaultValue={defaultValues?.password ?? ""}
                            required
                        />
                        {gameFields.length > 0 ? (
                            <Paper withBorder radius="md" p="sm">
                                <Stack gap="sm">
                                    <Text size="sm" fw={500}>
                                        Game-specific fields
                                    </Text>
                                    {gameFields.map((field) => {
                                        const commonProps = {
                                            id: `gameField-${field.id}`,
                                            name: `gameField__${field.id}`,
                                            inputMode: field.inputMode,
                                            defaultValue:
                                                defaultValues?.gameData?.[
                                                    field.id
                                                ] ?? "",
                                            placeholder: field.placeholder,
                                            label: field.label,
                                        };

                                        return (
                                            <Stack key={field.id} gap={4}>
                                                {field.type === "password" ? (
                                                    <PasswordInput
                                                        {...commonProps}
                                                    />
                                                ) : (
                                                    <TextInput
                                                        {...commonProps}
                                                        type={
                                                            field.type ??
                                                            "text"
                                                        }
                                                    />
                                                )}
                                                {field.helperText ? (
                                                    <Text size="xs" c="dimmed">
                                                        {field.helperText}
                                                    </Text>
                                                ) : null}
                                            </Stack>
                                        );
                                    })}
                                </Stack>
                            </Paper>
                        ) : null}
                        <Textarea
                            label="Notes"
                            id="notes"
                            name="notes"
                            defaultValue={defaultValues?.notes ?? ""}
                            className="resize-none"
                            rows={4}
                        />
                        <Button type="submit" fullWidth>
                            {isEditing ? "Update account" : "Add account"}
                        </Button>
                    </Stack>
                </form>
            </Stack>
        </Modal>
    );
}
