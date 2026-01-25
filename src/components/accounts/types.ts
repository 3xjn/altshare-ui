import type { Account } from "@/stores/AccountStore";

export type AccountSection = {
    id: string;
    name: string;
    accounts: Account[];
};
