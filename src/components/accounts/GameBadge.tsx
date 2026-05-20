import { Box, Group, Text } from "@mantine/core";
import { getGameConfig } from "@/config/games";

type GameBadgeProps = {
    game?: string;
};

export function GameBadge({ game }: GameBadgeProps) {
    const gameConfig = getGameConfig(game);

    const renderIcon = () => {
        if (gameConfig.icon) {
            return (
                <img
                    className="w-8 h-8 rounded-md object-cover"
                    src={gameConfig.icon}
                    alt={gameConfig.label}
                />
            );
        }

        const initials = gameConfig.label
            .split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

        return (
            <Box className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                {initials}
            </Box>
        );
    };

    return (
        <Group gap="sm" wrap="nowrap">
            {renderIcon()}
            <Text size="sm" c={gameConfig.id === "None" ? "dimmed" : undefined}>
                {gameConfig.label}
            </Text>
        </Group>
    );
}
