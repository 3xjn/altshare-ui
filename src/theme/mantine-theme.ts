import { createTheme } from "@mantine/core";

const fontFamily = "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif";

export const mantineTheme = createTheme({
    fontFamily,
    headings: {
        fontFamily,
    },
    defaultRadius: "md",
    primaryColor: "blue",
    black: "#020617",
    white: "#f8fafc",
    colors: {
        dark: [
            "#f8fafc",
            "#e2e8f0",
            "#cbd5e1",
            "#94a3b8",
            "#64748b",
            "#334155",
            "#1e293b",
            "#0f172a",
            "#0b1120",
            "#020617",
        ],
    },
    components: {
        Paper: {
            defaultProps: {
                radius: "lg",
            },
        },
        Button: {
            defaultProps: {
                radius: "md",
            },
        },
        ActionIcon: {
            defaultProps: {
                radius: "md",
            },
        },
    },
});
