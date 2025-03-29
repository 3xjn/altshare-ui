import { BrowserRouter, Routes, Route } from "react-router-dom";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Login } from "./pages/Login.tsx";
import { Signup } from "./pages/Signup.tsx";
import { ThemeProvider } from "./components/theme-provider.tsx";
import { Accounts } from "./pages/Accounts.tsx";
import { ToastProvider } from "./components/ui/toast.tsx";
import { Toaster } from "./components/ui/toaster.tsx";
import { Invite } from "./pages/Invite.tsx";

createRoot(document.getElementById("root")!).render(
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ToastProvider>
            <Toaster />
            <BrowserRouter>
                <Routes>
                    <Route path="/">
                        <Route index element={<Accounts />} />
                        <Route path="login" element={<Login />} />
                        <Route path="signup" element={<Signup />} />
                        <Route path="invite" element={<Invite />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </ToastProvider>
    </ThemeProvider>
);
