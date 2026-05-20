export interface AccountGroup {
    id: string;
    name: string;
    usesMasterKey: boolean;
    encryptedGroupKey?: string | null;
}

export interface Account {
    id: string;
    username: string;
    password: string;
    notes?: string;
    rank?: string;
    isShared?: boolean;
    game?: string;
    gameData?: Record<string, string>;
    isLoadingRank: boolean;
    groupId?: string;
}
