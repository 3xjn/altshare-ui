import type { Account } from "@/types/account";

export type AccountSection = {
    id: string;
    name: string;
    accounts: Account[];
    totalCount?: number;
    collapsed?: boolean;
};
