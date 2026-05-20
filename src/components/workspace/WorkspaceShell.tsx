import {
    AppShell,
    Burger,
    Divider,
    Group,
    NavLink,
    ScrollArea,
    Stack,
    Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
    FolderKanban,
    LayoutGrid,
    Settings,
    Share2,
    UserCircle2,
} from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

type WorkspaceNavItem = {
    label: string;
    href: string;
    icon: React.ReactNode;
};

const primaryNav: WorkspaceNavItem[] = [
    { label: "Accounts", href: "/accounts", icon: <LayoutGrid size={18} /> },
    { label: "Shared", href: "/shared", icon: <Share2 size={18} /> },
    { label: "Groups", href: "/groups", icon: <FolderKanban size={18} /> },
];

const secondaryNav: WorkspaceNavItem[] = [
    { label: "Settings", href: "/settings", icon: <Settings size={18} /> },
    { label: "Account", href: "/account", icon: <UserCircle2 size={18} /> },
];

export function WorkspaceShell() {
    const [opened, { toggle }] = useDisclosure(false);
    const navigate = useNavigate();
    const location = useLocation();

    const renderNavItem = (item: WorkspaceNavItem) => {
        const active =
            location.pathname === item.href ||
            (item.href !== "/accounts" && location.pathname.startsWith(`${item.href}/`));

        return (
            <NavLink
                key={item.href}
                active={active}
                variant="light"
                leftSection={item.icon}
                label={item.label}
                onClick={() => navigate(item.href)}
            />
        );
    };

    return (
        <AppShell
            padding="md"
            navbar={{ width: 280, breakpoint: "sm", collapsed: { mobile: !opened } }}
            header={{ height: 60 }}
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Group gap="sm">
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Toggle navigation" />
                        <Text fw={700} size="lg">
                            AltShare
                        </Text>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                <AppShell.Section>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb="sm">
                        Workspace
                    </Text>
                </AppShell.Section>

                <AppShell.Section grow component={ScrollArea} type="scroll" offsetScrollbars>
                    <Stack gap="xs">
                        {primaryNav.map(renderNavItem)}
                        <Divider my="sm" />
                        {secondaryNav.map(renderNavItem)}
                    </Stack>
                </AppShell.Section>
            </AppShell.Navbar>

            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}
