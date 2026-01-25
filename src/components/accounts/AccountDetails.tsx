import { TextLabel } from "@/components/ui/text-label";
import { CircularProgress } from "@/components/ui/progress";
import { getImageFromRank } from "@/utils/getImageFromRank";
import { getGameConfig } from "@/config/games";
import { Lock } from "lucide-react";
import type { Account } from "@/stores/AccountStore";

type AccountDetailsProps = {
    account: Account;
};

export function AccountDetails({ account }: AccountDetailsProps) {
    const renderDerivedGameDetails = () => {
        const gameConfig = getGameConfig(account.game);

        if (gameConfig.id !== "Marvel Rivals") {
            return null;
        }

        return (
            <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Rank</div>
                <div className="flex items-center gap-2">
                    {account.isLoadingRank ? (
                        <CircularProgress />
                    ) : (
                        account.rank && (
                            <img
                                className="w-[30px] h-[30px] object-cover rounded-md"
                                src={getImageFromRank(account.rank)}
                                alt={account.rank}
                            />
                        )
                    )}
                    {!account.isLoadingRank &&
                        (account.rank ? (
                            <span>{account.rank}</span>
                        ) : (
                            <Lock color="gray" />
                        ))}
                </div>
            </div>
        );
    };

    const gameConfig = getGameConfig(account.game);
    const gameFields = gameConfig.fields ?? [];
    const derivedDetails = renderDerivedGameDetails();

    return (
        <div className="grid gap-4">
            {derivedDetails ? (
                <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Game data
                    </div>
                    {derivedDetails}
                </div>
            ) : null}
            <div className="space-y-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Game-specific fields
                </div>
                {gameFields.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {gameFields.map((field) => {
                            const value = account.gameData?.[field.id] ?? "";
                            return (
                                <div key={field.id} className="space-y-2">
                                    <div className="text-sm font-medium text-foreground">
                                        {field.label}
                                    </div>
                                    {value ? (
                                        field.type === "password" ? (
                                            <TextLabel
                                                content={value}
                                                showCopyButton
                                                showEyeButton
                                            />
                                        ) : (
                                            <span className="text-sm text-foreground">
                                                {value}
                                            </span>
                                        )
                                    ) : (
                                        <span className="text-sm text-muted-foreground">
                                            Not set
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No game-specific fields for {gameConfig.label}.
                    </p>
                )}
            </div>
        </div>
    );
}
