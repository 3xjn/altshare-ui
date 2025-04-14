export function getImageFromRank(rank?: string) {
    if (!rank) return undefined;

    if (rank == "One Above All") return "./images/ranks/one-above-all.png";
    return `./images/ranks/${rank.split(" ")[0].toLowerCase()}.png`;
}