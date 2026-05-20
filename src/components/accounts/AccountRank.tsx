import { Group, Loader, Text } from "@mantine/core";
import { supportsRankTracking } from "@/config/games";
import type { Account } from "@/types/account";
import { getImageFromRank } from "@/utils/getImageFromRank";
import { Lock } from "lucide-react";

type AccountRankProps = {
    account: Account;
    compact?: boolean;
};

export function AccountRank({ account, compact = false }: AccountRankProps) {
    if (!supportsRankTracking(account.game)) {
        return (
            <Text size="sm" c="dimmed">
                Not tracked
            </Text>
        );
    }

    if (account.isLoadingRank) {
        return (
            <Group gap="xs" wrap="nowrap">
                <Loader type="oval" size={compact ? "xs" : "sm"} />
                {!compact ? (
                    <Text size="sm" c="dimmed">
                        Loading rank...
                    </Text>
                ) : null}
            </Group>
        );
    }

    if (!account.rank) {
        return (
            <Group gap="xs" wrap="nowrap">
                <Lock className="h-4 w-4" />
                {!compact ? (
                    <Text size="sm" c="dimmed">
                        Unavailable
                    </Text>
                ) : null}
            </Group>
        );
    }

    return (
        <Group gap="xs" wrap="nowrap" className="min-w-0">
            <img
                className="h-7 w-7 rounded-md object-cover"
                src={getImageFromRank(account.rank)}
                alt={account.rank}
            />
            <Text size="sm" className="truncate">
                {account.rank}
            </Text>
        </Group>
    );
}
