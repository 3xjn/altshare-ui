import {
    ActionIcon,
    AppShell,
    Burger,
    Divider,
    Group,
    NavLink,
    ScrollArea,
    Stack,
    Text,
    useComputedColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
    FolderKanban,
    LayoutGrid,
    Settings,
    Share2,
    Sun,
    Moon,
    UserCircle2,
} from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@/components/use-theme";

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
    const { resolvedTheme, setTheme } = useTheme();
    const colorScheme = useComputedColorScheme("light", {
        getInitialValueInEffect: false,
    });
    const isDark = colorScheme === "dark" || resolvedTheme === "dark";
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    const themeToggleLabel =
        nextTheme === "dark" ? "Switch to dark theme" : "Switch to light theme";
    const shellTone = isDark
        ? {
              header: "#0f172a",
              nav: "#0b1120",
              main: "linear-gradient(180deg, #07111f 0%, #0b1220 45%, #111827 100%)",
              headerBorder: "rgba(148, 163, 184, 0.16)",
              navBorder: "rgba(148, 163, 184, 0.14)",
              activeBg: "rgba(37, 99, 235, 0.22)",
              activeColor: "#dbeafe",
              navHover: "rgba(148, 163, 184, 0.10)",
          }
        : {
              header: undefined,
              nav: undefined,
              main: undefined,
              headerBorder: undefined,
              navBorder: undefined,
              activeBg: undefined,
              activeColor: undefined,
              navHover: undefined,
          };

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
                styles={
                    isDark
                        ? {
                              root: {
                                  borderRadius: 10,
                                  color: active ? shellTone.activeColor : "#cbd5e1",
                                  backgroundColor: active ? shellTone.activeBg : "transparent",
                              },
                              label: { fontWeight: active ? 600 : 500 },
                          }
                        : undefined
                }
                style={
                    isDark
                        ? {
                              "--nl-hover": shellTone.navHover,
                          }
                        : undefined
                }
            />
        );
    };

    return (
        <AppShell
            padding="md"
            navbar={{ width: 280, breakpoint: "sm", collapsed: { mobile: !opened } }}
            header={{ height: 60 }}
        >
            <AppShell.Header
                data-testid="workspace-shell-header"
                style={{
                    backgroundColor: shellTone.header,
                    borderBottom: isDark ? `1px solid ${shellTone.headerBorder}` : undefined,
                }}
            >
                <Group h="100%" px="md" justify="space-between">
                    <Group gap="sm">
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Toggle navigation" />
                        <Text fw={700} size="lg">
                            AltShare
                        </Text>
                    </Group>
                    <ActionIcon
                        variant={isDark ? "filled" : "subtle"}
                        size="lg"
                        radius="xl"
                        aria-label={themeToggleLabel}
                        onClick={() => setTheme(nextTheme)}
                        style={
                            isDark
                                ? {
                                      backgroundColor: "rgba(30, 41, 59, 0.84)",
                                      color: "#fde68a",
                                      border: "1px solid rgba(253, 230, 138, 0.18)",
                                  }
                                : undefined
                        }
                    >
                        {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                    </ActionIcon>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar
                p="md"
                data-testid="workspace-shell-navbar"
                style={{
                    backgroundColor: shellTone.nav,
                    borderRight: isDark ? `1px solid ${shellTone.navBorder}` : undefined,
                }}
            >
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

            <AppShell.Main
                data-testid="workspace-shell-main"
                style={{
                    background: shellTone.main,
                    minHeight: "100vh",
                }}
            >
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}
