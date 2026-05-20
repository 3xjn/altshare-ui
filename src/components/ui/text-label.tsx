"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
    ActionIcon,
    Box,
    Group,
    Stack,
    Text,
    VisuallyHidden,
    alpha,
    useComputedColorScheme,
    useMantineTheme,
} from "@mantine/core";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TextLabelProps {
    /**
     * The text content to display or hide.
     */
    content: string;
    /**
     * Whether to display a copy-to-clipboard button.
     */
    showCopyButton?: boolean;
    /**
     * Whether to display an eye icon button to toggle visibility.
     */
    showEyeButton?: boolean;
    /**
     * Optional label text that appears above the content.
     */
    label?: string;
    /**
     * Additional CSS class names to style the wrapper.
     */
    className?: string;
}

export function TextLabel({
    content,
    showCopyButton = false,
    showEyeButton = false,
    label,
    className,
}: TextLabelProps) {
    const theme = useMantineTheme();
    const colorScheme = useComputedColorScheme("light", {
        getInitialValueInEffect: false,
    });
    const contentId = useId();
    const labelId = useId();
    const hiddenPlaceholder = "\u2022".repeat(10);
    const [isVisible, setIsVisible] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const copiedTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (copiedTimeoutRef.current !== null) {
                window.clearTimeout(copiedTimeoutRef.current);
            }
        };
    }, []);

    const handleToggleVisibility = () => {
        if (showEyeButton) {
            setIsVisible((prev) => !prev);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setIsCopied(true);
            if (copiedTimeoutRef.current !== null) {
                window.clearTimeout(copiedTimeoutRef.current);
            }
            copiedTimeoutRef.current = window.setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        } catch {
            setIsCopied(false);
        }
    };

    const displayContent =
        showEyeButton && !isVisible ? hiddenPlaceholder : content;

    const contentSurface =
        colorScheme === "dark"
              ? {
                  background: "rgba(15, 23, 42, 0.76)",
                  border: "rgba(148, 163, 184, 0.18)",
                  text: "#e2e8f0",
                  muted: "#94a3b8",
                  success: theme.colors.green[4],
              }
            : {
                  background: alpha(theme.white, 0.94),
                  border: alpha(theme.black, 0.08),
                  text: theme.colors.dark[7],
                  muted: theme.colors.gray[6],
                  success: theme.colors.green[6],
              };

    return (
        <Stack gap={4} className={cn("w-full max-w-full", className)}>
            {label ? (
                <Text id={labelId} size="sm" fw={500}>
                    {label}
                </Text>
            ) : null}

            <Box
                className="relative"
                role="group"
                aria-labelledby={label ? labelId : undefined}
            >
                <Box
                    id={contentId}
                    className="flex h-10 w-full items-center rounded-md border px-3 py-2 pr-20 text-sm"
                    style={{
                        backgroundColor: contentSurface.background,
                        borderColor: contentSurface.border,
                    }}
                    aria-label={showEyeButton && !isVisible ? "Hidden content" : content}
                >
                    <Text
                        component="span"
                        span
                        truncate="end"
                        ff="monospace"
                        size="sm"
                        w="100%"
                        c={showEyeButton && !isVisible ? contentSurface.muted : contentSurface.text}
                    >
                        {displayContent}
                    </Text>
                </Box>

                <Group
                    gap={4}
                    wrap="nowrap"
                    className="absolute inset-y-0 right-0 pr-2"
                >
                    {showCopyButton && (
                        <ActionIcon
                            variant="subtle"
                            size="lg"
                            onClick={handleCopy}
                            aria-label={
                                isCopied
                                    ? `${label ?? "Content"} copied`
                                    : `Copy ${label ?? "content"} to clipboard`
                            }
                            style={{ color: isCopied ? contentSurface.success : contentSurface.muted }}
                        >
                            {isCopied ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </ActionIcon>
                    )}

                    {showEyeButton && (
                        <ActionIcon
                            variant="subtle"
                            size="lg"
                            onClick={handleToggleVisibility}
                            aria-controls={contentId}
                            aria-pressed={isVisible}
                            aria-label={
                                isVisible ? "Hide content" : "Show content"
                            }
                            style={{ color: contentSurface.muted }}
                        >
                            {isVisible ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </ActionIcon>
                    )}
                </Group>
                <VisuallyHidden aria-live="polite">
                    {isCopied ? `${label ?? "Content"} copied to clipboard` : ""}
                </VisuallyHidden>
            </Box>
        </Stack>
    );
}
