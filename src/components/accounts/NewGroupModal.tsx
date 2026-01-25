import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NewGroupModalProps = {
    open: boolean;
    name: string;
    onNameChange: (value: string) => void;
    onOpenChange: (open: boolean) => void;
    onSubmit: () => void;
};

export function NewGroupModal({
    open,
    name,
    onNameChange,
    onOpenChange,
    onSubmit,
}: NewGroupModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>New Group</DialogTitle>
                    <DialogDescription>
                        Create a group to control what you share.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="group-name">Group name</Label>
                    <Input
                        id="group-name"
                        value={name}
                        onChange={(event) => onNameChange(event.target.value)}
                        placeholder="e.g. Friends"
                    />
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit}>Create group</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
