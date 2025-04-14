import * as React from "react";
import { cn } from "@/lib/utils";

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
    direction?: "row" | "column";
    spacing?: "none" | "small" | "medium" | "large";
    align?: "start" | "center" | "end" | "stretch";
    justify?: "start" | "center" | "end" | "between";
    wrap?: boolean;
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
    (
        {
            className,
            direction = "column",
            spacing = "medium",
            align = "stretch",
            justify = "start",
            wrap = false,
            ...props
        },
        ref
    ) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "flex",
                    {
                        "flex-row": direction === "row",
                        "flex-col": direction === "column",
                        "items-start": align === "start",
                        "items-center": align === "center",
                        "items-end": align === "end",
                        "items-stretch": align === "stretch",
                        "justify-start": justify === "start",
                        "justify-center": justify === "center",
                        "justify-end": justify === "end",
                        "justify-between": justify === "between",
                        "flex-wrap": wrap,
                        "gap-0": spacing === "none",
                        "gap-2": spacing === "small",
                        "gap-4": spacing === "medium",
                        "gap-6": spacing === "large",
                    },
                    className
                )}
                {...props}
            />
        );
    }
);
Stack.displayName = "Stack";

export { Stack };
