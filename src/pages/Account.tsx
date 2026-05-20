import { Button, Paper, Stack, Text } from "@mantine/core";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAccountStore } from "@/stores/AccountStore";

export function Account() {
    const { isAuthenticated, currentEmail, decryptedAccounts, groups, defaultGroupId, logout } = useAccountStore();
    const { toast } = useToast();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const handleExportData = () => {
        const ownedAccounts = decryptedAccounts.filter((account) => !account.isShared);
        if (ownedAccounts.length === 0) {
            toast({
                variant: "destructive",
                title: "No accounts to export",
                description: "Add an account before exporting.",
            });
            return;
        }

        const groupLookup = new Map(groups.map((group) => [group.id, group.name]));
        const exportedAt = new Date().toISOString();
        const payload = {
            version: 1,
            exportedAt,
            groups: groups.map((group) => ({
                id: group.id,
                name: group.name,
                usesMasterKey: group.usesMasterKey,
            })),
            accounts: ownedAccounts.map((account) => {
                const resolvedGroupId = account.groupId ?? defaultGroupId ?? null;
                return {
                    username: account.username,
                    password: account.password,
                    notes: account.notes ?? "",
                    game: account.game ?? "",
                    gameData: account.gameData ?? {},
                    groupId: resolvedGroupId,
                    groupName: resolvedGroupId ? groupLookup.get(resolvedGroupId) ?? "Personal" : null,
                };
            }),
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `altshare-export-${exportedAt.replace(/[:.]/g, "-")}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({ title: "Export ready", description: "Your JSON export has been downloaded." });
    };

    return (
        <Stack gap="lg">
            <div>
                <Text size="xl" fw={700}>Account</Text>
                <Text c="dimmed" size="sm">Manage your account-level actions.</Text>
            </div>

            <Paper withBorder radius="lg" p="xl">
                <Stack gap="sm">
                    <Text fw={600}>{currentEmail ?? "Signed in"}</Text>
                    <Button variant="outline" onClick={handleExportData}>Export data</Button>
                    <Button color="red" variant="light" onClick={logout}>Logout</Button>
                </Stack>
            </Paper>
        </Stack>
    );
}
