import { Paper, Stack, Switch, Text } from "@mantine/core";
import { Navigate } from "react-router-dom";
import { useTheme } from "@/components/use-theme";
import { useAccountStore } from "@/stores/AccountStore";

export function Settings() {
    const { isAuthenticated } = useAccountStore();
    const { resolvedTheme, setTheme } = useTheme();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <Stack gap="lg">
            <div>
                <Text size="xl" fw={700}>Settings</Text>
                <Text c="dimmed" size="sm">Adjust your workspace preferences.</Text>
            </div>

            <Paper withBorder radius="lg" p="xl">
                <Stack gap="md">
                    <Switch
                        checked={resolvedTheme === "dark"}
                        onChange={(event) => setTheme(event.currentTarget.checked ? "dark" : "light")}
                        label="Use dark theme"
                    />
                </Stack>
            </Paper>
        </Stack>
    );
}
