import { Stack } from "@/components/ui/stack";
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
            <div className="w-8 h-8 rounded-md bg-muted text-xs font-semibold text-muted-foreground flex items-center justify-center">
                {initials}
            </div>
        );
    };

    return (
        <Stack direction="row" align="center" spacing="small">
            {renderIcon()}
            <span
                className={
                    gameConfig.id === "None"
                        ? "text-sm text-muted-foreground"
                        : "text-sm text-foreground"
                }
            >
                {gameConfig.label}
            </span>
        </Stack>
    );
}
