"use client";

import * as React from "react";
import {
    ThemeContext,
    type Theme,
    type ThemeContextValue,
    type ResolvedTheme,
} from "./use-theme";

type ThemeProviderProps = {
    children: React.ReactNode;
    attribute?: "class";
    defaultTheme?: Theme;
    enableSystem?: boolean;
};

const STORAGE_KEY = "theme";

function getSystemTheme(): ResolvedTheme {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return "light";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function applyThemeClass(theme: ResolvedTheme) {
    if (typeof document === "undefined") {
        return;
    }

    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
}

export function ThemeProvider({
    children,
    attribute = "class",
    defaultTheme = "system",
    enableSystem = true,
}: ThemeProviderProps) {
    const [theme, setThemeState] = React.useState<Theme>(() => {
        if (typeof window === "undefined") {
            return defaultTheme;
        }

        const storedTheme = window.localStorage.getItem(STORAGE_KEY);
        if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
            return storedTheme;
        }

        return defaultTheme;
    });

    const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(() =>
        theme === "system" && enableSystem ? getSystemTheme() : theme === "dark" ? "dark" : "light"
    );

    React.useEffect(() => {
        const nextResolvedTheme =
            theme === "system" && enableSystem
                ? getSystemTheme()
                : theme === "dark"
                  ? "dark"
                  : "light";

        setResolvedTheme(nextResolvedTheme);
        window.localStorage.setItem(STORAGE_KEY, theme);
        applyThemeClass(nextResolvedTheme);

        if (theme !== "system" || !enableSystem || typeof window.matchMedia !== "function") {
            return;
        }

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            const systemTheme = getSystemTheme();
            setResolvedTheme(systemTheme);
            applyThemeClass(systemTheme);
        };

        mediaQuery.addEventListener?.("change", handleChange);
        mediaQuery.addListener?.(handleChange);

        return () => {
            mediaQuery.removeEventListener?.("change", handleChange);
            mediaQuery.removeListener?.(handleChange);
        };
    }, [attribute, enableSystem, theme]);

    const value = React.useMemo<ThemeContextValue>(
        () => ({
            theme,
            resolvedTheme,
            setTheme: setThemeState,
        }),
        [resolvedTheme, theme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
