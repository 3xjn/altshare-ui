"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
    // State to manage visibility when eye button is shown
    const [isVisible, setIsVisible] = useState(false);
    // State to manage copy status feedback
    const [isCopied, setIsCopied] = useState(false);

    /**
     * Toggle the content visibility if the eye button is shown.
     */
    const handleToggleVisibility = () => {
        if (showEyeButton) {
            setIsVisible((prev) => !prev);
        }
    };

    /**
     * Copy the content to the clipboard and show feedback.
     */
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setIsCopied(true);

            // Reset copied state after a short interval
            setTimeout(() => setIsCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy text:", error);
        }
    };

    /**
     * If the eye button is enabled and the content is hidden, replace the text
     * with bullet characters. Otherwise, display the plain text.
     */
    const displayContent =
        showEyeButton && !isVisible ? "•".repeat(content.length) : content;

    return (
        <div className={cn("space-y-2 max-w-300 w-full", className)}>
            {/* Optional label for the field */}
            {label && <Label htmlFor="text-label-content">{label}</Label>}

            <div className="relative flex items-center">
                <div
                    id="text-label-content"
                    className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm pr-20 ring-offset-background"
                >
                    {/* Truncate long text and show a monospace style for clarity */}
                    <span className="truncate font-mono">{displayContent}</span>
                </div>

                {/* Action buttons (eye and copy) */}
                <div className="absolute right-0 flex items-center pr-2">
                    {showCopyButton && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCopy}
                            className="h-8 w-8"
                            aria-label={
                                isCopied ? "Copied" : "Copy to clipboard"
                            }
                        >
                            {isCopied ? (
                                <Check className="h-4 w-4 text-primary" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </Button>
                    )}

{showEyeButton && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleToggleVisibility}
                            className="h-8 w-8"
                            aria-label={
                                isVisible ? "Hide content" : "Show content"
                            }
                        >
                            {isVisible ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}