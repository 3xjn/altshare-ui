import { useId, useState } from "react";
import {
    Button,
    Modal,
    Paper,
    ScrollArea,
    Stack,
    Text,
    UnstyledButton,
    alpha,
    useComputedColorScheme,
    useMantineTheme,
} from "@mantine/core";
import { ChevronDown } from "lucide-react";

interface ExpandableNotesProps {
    content: string;
    showCopyButton?: boolean;
}

export function ExpandableNotes({ content, showCopyButton = false }: ExpandableNotesProps) {
    const theme = useMantineTheme();
    const colorScheme = useComputedColorScheme("light", {
        getInitialValueInEffect: false,
    });
    const dialogBodyId = useId();
    const [isOpen, setIsOpen] = useState(false);
    const firstLine = content.trim().split("\n")[0] ?? "";
    const hasMoreLines = content.trim().includes("\n");

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
        } catch {
            // Ignore clipboard failures without interrupting note viewing.
        }
    };

    const noteTone =
        colorScheme === "dark"
            ? {
                  hover: alpha(theme.white, 0.06),
                  panel: alpha(theme.colors.dark[6], 0.94),
                  border: alpha(theme.white, 0.1),
                  text: theme.colors.gray[1],
                  hint: theme.colors.gray[5],
              }
            : {
                  hover: alpha(theme.colors.blue[6], 0.05),
                  panel: alpha(theme.white, 0.96),
                  border: alpha(theme.black, 0.08),
                  text: theme.colors.dark[6],
                  hint: theme.colors.gray[6],
              };

    if (!content.trim()) {
        return (
            <Text size="sm" c="dimmed" px="sm" py={6}>
                No additional notes available
            </Text>
        );
    }

    return (
        <div>
            <UnstyledButton
                onClick={() => setIsOpen(true)}
                aria-controls={isOpen ? dialogBodyId : undefined}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                className="w-full rounded-md px-3 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ transition: "background-color 150ms ease" }}
                onMouseEnter={(event) => {
                    event.currentTarget.style.backgroundColor = noteTone.hover;
                }}
                onMouseLeave={(event) => {
                    event.currentTarget.style.backgroundColor = "transparent";
                }}
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 text-sm">
                        <Text component="span" span size="sm" truncate="end" c={noteTone.text}>
                            {firstLine}
                        </Text>
                        {hasMoreLines && (
                            <Text component="span" span size="xs" c={noteTone.hint} ml={8}>
                                + more
                            </Text>
                        )}
                    </div>
                    {hasMoreLines && (
                        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                </div>
            </UnstyledButton>

            <Modal
                opened={isOpen}
                onClose={() => setIsOpen(false)}
                title="Notes"
                centered
                size="lg"
                withinPortal
            >
                <Stack
                    id={dialogBodyId}
                    gap="sm"
                    data-no-row-select="true"
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    <Paper
                        withBorder
                        radius="md"
                        p="md"
                        style={{
                            backgroundColor: noteTone.panel,
                            borderColor: noteTone.border,
                        }}
                    >
                        <ScrollArea.Autosize mah={320} type="auto">
                            <Text
                                component="pre"
                                size="sm"
                                ff="monospace"
                                c={noteTone.text}
                                style={{
                                    margin: 0,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                }}
                            >
                                {content}
                            </Text>
                        </ScrollArea.Autosize>
                    </Paper>
                    {showCopyButton && (
                        <div>
                            <Button variant="light" size="sm" onClick={handleCopy}>
                                Copy
                            </Button>
                        </div>
                    )}
                </Stack>
            </Modal>
        </div>
    );
}
