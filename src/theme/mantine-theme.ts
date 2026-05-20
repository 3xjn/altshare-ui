import { createTheme } from "@mantine/core";

const fontFamily = "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif";

export const mantineTheme = createTheme({
    fontFamily,
    headings: {
        fontFamily,
    },
    defaultRadius: "md",
});
