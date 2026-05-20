import { useEffect, useState } from "react";
import type { Toast } from "@/hooks/use-toast";

type UseAccountsLifecycleArgs = {
    isAuthenticated: boolean;
    currentPassword: string | null;
    loadGroups: () => Promise<void>;
    loadAccounts: () => Promise<void>;
    loadSharedAccounts: () => Promise<void>;
    getRanks: () => Promise<void>;
    toast: (args: Toast) => void;
};

export function useAccountsLifecycle({
    isAuthenticated,
    currentPassword,
    loadGroups,
    loadAccounts,
    loadSharedAccounts,
    getRanks,
    toast,
}: UseAccountsLifecycleArgs) {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initializeAccounts = async () => {
            try {
                if (currentPassword) {
                    await loadGroups();
                    await loadAccounts();
                    await loadSharedAccounts();
                    void getRanks();
                }
            } catch (error) {
                console.error("Failed to load accounts:", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description:
                        "Failed to load accounts. Please try logging in again.",
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (isAuthenticated) {
            void initializeAccounts();
        } else {
            setIsLoading(false);
        }
    }, [
        currentPassword,
        getRanks,
        isAuthenticated,
        loadAccounts,
        loadGroups,
        loadSharedAccounts,
        toast,
    ]);

    const refreshAccounts = async () => {
        if (!currentPassword) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Please log in again to refresh accounts.",
            });
            return;
        }

        setIsLoading(true);
        try {
            await loadGroups();
            await loadAccounts();
            await loadSharedAccounts();
            void getRanks();

            toast({
                title: "Success",
                description: "Accounts refreshed successfully.",
            });
        } catch (error) {
            console.error("Failed to refresh accounts:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description:
                    "Failed to refresh accounts. Please try logging in again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        refreshAccounts,
    };
}
