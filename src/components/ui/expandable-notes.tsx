import { useState } from 'react';
import { Button } from './button';
import { ChevronDown } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from './dialog';

interface ExpandableNotesProps {
    content: string;
    showCopyButton?: boolean;
}

export function ExpandableNotes({ content, showCopyButton = false }: ExpandableNotesProps) {
    const [isOpen, setIsOpen] = useState(false);
    const firstLine = content.split('\n')[0];
    const hasMoreLines = content.includes('\n');

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
    };

    if (!content.trim()) {
        return (
            <div className="px-3 py-1.5">
                <span className="text-sm text-muted-foreground">No additional notes available</span>
            </div>
        );
    }

    return (
        <div>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full text-left px-3 py-1.5 rounded-md hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 text-sm">
                        <span className="text-foreground/80">{firstLine}</span>
                        {hasMoreLines && (
                            <span className="text-xs text-muted-foreground ml-2">
                                + more
                            </span>
                        )}
                    </div>
                    {hasMoreLines && (
                        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                </div>
            </button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Notes</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                        <div className="rounded-md bg-muted p-4">
                            <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
                                {content}
                            </pre>
                            {showCopyButton && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopy}
                                    className="mt-2"
                                >
                                    Copy
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}