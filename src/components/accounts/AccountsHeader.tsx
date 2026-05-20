import {
    Box,
    Button,
    Group,
    useMantineColorScheme,
} from "@mantine/core";
import { Plus, RefreshCcw } from "lucide-react";

type AccountsHeaderProps = {
    onRefresh: () => void;
    onAddAccount: () => void;
};

export function AccountsHeader({
    onRefresh,
    onAddAccount,
}: AccountsHeaderProps) {
    const { colorScheme } = useMantineColorScheme();
    const bannerSrc =
        colorScheme === "dark"
            ? "./images/banner.png"
            : "./images/banner-light.png";

    return (
        <Group justify="space-between" align="flex-start" gap="md" wrap="wrap">
            <Box
                component="img"
                src={bannerSrc}
                alt="AltShare"
                maw={220}
                w="100%"
                style={{ display: "block" }}
            />
            <Group gap="xs" wrap="wrap" justify="flex-end">
                <Button
                    onClick={onAddAccount}
                    size="sm"
                    leftSection={<Plus className="h-4 w-4" />}
                >
                    Add account
                </Button>
                <Button
                    onClick={onRefresh}
                    variant="light"
                    size="sm"
                    leftSection={<RefreshCcw className="h-4 w-4" />}
                >
                    Refresh
                </Button>
            </Group>
        </Group>
    );
}
