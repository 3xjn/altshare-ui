import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "./ui/select";

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
        <Select defaultValue={rank as unknown as string}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectLabel></SelectLabel>
                    {RANKS.map((rank) => (
                        <div key={rank.name}>
                            <SelectLabel>
                                {rank.name}
                            </SelectLabel>
                            {rank.subRanks.length > 0 && (
                                <div className="ml-4">
                                    {rank.subRanks.map((subRank) => (
                                        <SelectItem
                                            key={`${rank.name}-${subRank}`}
                                            value={`${rank.name}-${subRank}`}
                                        >
                                            {`${rank.name} ${subRank}`}
                                        </SelectItem>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}
