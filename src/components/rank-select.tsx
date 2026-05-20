import { NativeSelect } from "@mantine/core";

interface RankSelectProps {
    rank: (typeof RANKS)[number]["name"];
}

export const RANKS = [
    { name: "BRONZE", subRanks: ["III", "II", "I"] },
    { name: "SILVER", subRanks: ["III", "II", "I"] },
    { name: "GOLD", subRanks: ["III", "II", "I"] },
    { name: "PLATINUM", subRanks: ["III", "II", "I"] },
    { name: "DIAMOND", subRanks: ["III", "II", "I"] },
    { name: "GRANDMASTER", subRanks: ["III", "II", "I"] },
    { name: "CELESTIAL", subRanks: ["III", "II", "I"] },
    { name: "ETERNITY", subRanks: ["III", "II", "I"] },
    { name: "ONE ABOVE ALL", subRanks: ["III", "II", "I"] },
] as const;

export function RankSelect(props: RankSelectProps) {
    const { rank } = props;

    return (
        <NativeSelect
            defaultValue={rank}
            className="w-[180px]"
            data={RANKS.flatMap((tier) =>
                tier.subRanks.map((subRank) => ({
                    value: `${tier.name}-${subRank}`,
                    label: `${tier.name} ${subRank}`,
                }))
            )}
        />
    );
}
