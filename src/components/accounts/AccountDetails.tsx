import { Box, SimpleGrid, Stack, Text } from "@mantine/core";
import { TextLabel } from "@/components/ui/text-label";
import { getGameConfig, supportsRankTracking } from "@/config/games";
import type { Account } from "@/types/account";
import { AccountRank } from "@/components/accounts/AccountRank";

type AccountDetailsProps = {
    account: Account;
};

export function AccountDetails({ account }: AccountDetailsProps) {
    const renderDerivedGameDetails = () => {
        if (!supportsRankTracking(account.game)) {
            return null;
        }

        return (
            <Stack gap="xs">
                <Text size="sm" fw={500}>
                    Rank
                </Text>
                <AccountRank account={account} />
            </Stack>
        );
    };

    const gameConfig = getGameConfig(account.game);
    const gameFields = gameConfig.fields ?? [];
    const derivedDetails = renderDerivedGameDetails();

    return (
        <Stack gap="md">
            {derivedDetails ? (
                <Stack gap="xs">
                    <Text
                        size="xs"
                        c="dimmed"
                        className="uppercase tracking-wide"
                    >
                        Game data
                    </Text>
                    {derivedDetails}
                </Stack>
            ) : null}
            <Stack gap="sm">
                <Text
                    size="xs"
                    c="dimmed"
                    className="uppercase tracking-wide"
                >
                    Game-specific fields
                </Text>
                {gameFields.length > 0 ? (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        {gameFields.map((field) => {
                            const value = account.gameData?.[field.id] ?? "";
                            return (
                                <Stack key={field.id} gap="xs">
                                    <Text size="sm" fw={500}>
                                        {field.label}
                                    </Text>
                                    {value ? (
                                        field.type === "password" ? (
                                            <TextLabel
                                                content={value}
                                                showCopyButton
                                                showEyeButton
                                            />
                                        ) : (
                                            <Text size="sm">
                                                {value}
                                            </Text>
                                        )
                                    ) : (
                                        <Text size="sm" c="dimmed">
                                            Not set
                                        </Text>
                                    )}
                                </Stack>
                            );
                        })}
                    </SimpleGrid>
                ) : (
                    <Box>
                        <Text size="sm" c="dimmed">
                            No game-specific fields for {gameConfig.label}.
                        </Text>
                    </Box>
                )}
            </Stack>
        </Stack>
    );
}
