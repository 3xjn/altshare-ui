import { Button, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { Download, LogOut } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAccountStore } from "@/stores/AccountStore";

export function Account() {
    const { isAuthenticated, currentEmail, decryptedAccounts, groups, defaultGroupId, logout } = useAccountStore();
    const { toast } = useToast();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const ownedAccounts = decryptedAccounts.filter((account) => !account.isShared);
    const savedAccountLabel = `${ownedAccounts.length} saved account${ownedAccounts.length === 1 ? "" : "s"}`;
    const groupLabel = `${groups.length} group${groups.length === 1 ? "" : "s"}`;

    const handleExportData = () => {
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
        <Stack gap="md" maw={760}>
            <div>
                <Text size="xl" fw={700}>Account</Text>
                <Text c="dimmed" size="sm">Manage your profile, data export, and session.</Text>
            </div>

            <Paper withBorder radius="lg" p="md">
                <Stack gap="md">
                    <Group justify="space-between" align="flex-start" gap="md" wrap="wrap">
                        <Stack gap={2}>
                            <Text fw={600}>Signed in as {currentEmail ?? "Signed in"}</Text>
                            <Text c="dimmed" size="sm">Your AltShare workspace snapshot.</Text>
                        </Stack>
                        <Group gap="xs" data-testid="account-actions" data-layout="inline">
                            <Button
                                variant="outline"
                                size="sm"
                                leftSection={<Download size={16} />}
                                onClick={handleExportData}
                            >
                                Export data
                            </Button>
                            <Button
                                color="red"
                                variant="light"
                                size="sm"
                                leftSection={<LogOut size={16} />}
                                onClick={logout}
                            >
                                Log out
                            </Button>
                        </Group>
                    </Group>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                        <Paper withBorder radius="md" p="sm">
                            <Text fw={600}>{savedAccountLabel}</Text>
                            <Text size="xs" c="dimmed">Owned accounts available for export</Text>
                        </Paper>
                        <Paper withBorder radius="md" p="sm">
                            <Text fw={600}>{groupLabel}</Text>
                            <Text size="xs" c="dimmed">Groups organizing this workspace</Text>
                        </Paper>
                    </SimpleGrid>
                </Stack>
            </Paper>
        </Stack>
    );
}
