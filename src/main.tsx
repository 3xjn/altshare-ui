import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider, type MantineColorScheme } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Login } from "./pages/Login.tsx";
import { Signup } from "./pages/Signup.tsx";
import { ThemeProvider } from "./components/theme-provider.tsx";
import { useTheme } from "./components/use-theme.ts";
import { Accounts } from "./pages/Accounts.tsx";
import { Toaster } from "./components/ui/toaster.tsx";
import { Invite } from "./pages/Invite.tsx";
import { mantineTheme } from "./theme/mantine-theme.ts";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import { WorkspaceShell } from "./components/workspace/WorkspaceShell.tsx";
import { Shared } from "./pages/Shared.tsx";
import { Groups } from "./pages/Groups.tsx";
import { Settings } from "./pages/Settings.tsx";
import { Account } from "./pages/Account.tsx";

function MantineThemeBridge({ children }: PropsWithChildren) {
    const { resolvedTheme } = useTheme();

    const forceColorScheme: MantineColorScheme | undefined =
        resolvedTheme === "dark" || resolvedTheme === "light"
            ? resolvedTheme
            : undefined;

    return (
        <MantineProvider
            theme={mantineTheme}
            defaultColorScheme="auto"
            forceColorScheme={forceColorScheme}
        >
            {children}
        </MantineProvider>
    );
}

export function AppRoot() {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <MantineThemeBridge>
                <Toaster />
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/invite" element={<Invite />} />
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <WorkspaceShell />
                                </ProtectedRoute>
                            }
                        >
                            <Route index element={<Navigate to="/accounts" replace />} />
                            <Route path="accounts" element={<Accounts />} />
                            <Route path="shared" element={<Shared />} />
                            <Route path="groups" element={<Groups />} />
                            <Route path="settings" element={<Settings />} />
                            <Route path="account" element={<Account />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </MantineThemeBridge>
        </ThemeProvider>
    );
}

const rootElement = document.getElementById("root");

if (rootElement) {
    createRoot(rootElement).render(<AppRoot />);
}
