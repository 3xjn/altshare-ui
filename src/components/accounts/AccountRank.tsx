import { CircularProgress } from "@/components/ui/progress";
import { getGameConfig } from "@/config/games";
import type { Account } from "@/stores/AccountStore";
import { getImageFromRank } from "@/utils/getImageFromRank";
import { Lock } from "lucide-react";

type AccountRankProps = {
    account: Account;
    compact?: boolean;
};

export function AccountRank({ account, compact = false }: AccountRankProps) {
    const gameConfig = getGameConfig(account.game);

    if (gameConfig.id !== "Marvel Rivals") {
        return <span className="text-sm text-muted-foreground">Not tracked</span>;
    }

    if (account.isLoadingRank) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="scale-50 origin-left">
                    <CircularProgress />
                </div>
                {!compact ? <span>Loading rank...</span> : null}
            </div>
        );
    }

    if (!account.rank) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                {!compact ? <span>Unavailable</span> : null}
            </div>
        );
    }

    return (
        <div className="flex min-w-0 items-center gap-2">
            <img
                className="h-7 w-7 rounded-md object-cover"
                src={getImageFromRank(account.rank)}
                alt={account.rank}
            />
            <span className="truncate text-sm text-foreground">
                {account.rank}
            </span>
        </div>
    );
}
