import { Paper, Stack, Text } from "@mantine/core";
import { Navigate } from "react-router-dom";
import { useAccountStore } from "@/stores/AccountStore";

export function Settings() {
    const { isAuthenticated } = useAccountStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <Stack gap="md" maw={720}>
            <div>
                <Text size="xl" fw={700}>Settings</Text>
                <Text c="dimmed" size="sm">Adjust your workspace preferences.</Text>
            </div>

            <Paper withBorder radius="lg" p="md">
                <Stack gap={4}>
                    <Text fw={600}>Appearance</Text>
                    <Text c="dimmed" size="sm">
                        Theme is available from the top-right workspace control.
                    </Text>
                </Stack>
            </Paper>
        </Stack>
    );
}
