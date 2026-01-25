import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TextLabel } from "@/components/ui/text-label";
import { CircularProgress } from "@/components/ui/progress";
import type { AccountGroup } from "@/stores/AccountStore";

type InviteModalProps = {
    open: boolean;
    shareOpen: boolean;
    inviteeEmail: string | null;
    inviteCode: string | null;
    isConnecting: boolean;
    groups: AccountGroup[];
    defaultGroupId: string | null;
    shareGroupId: string | null;
    onShareGroupIdChange: (value: string) => void;
    onShareGroup: () => void;
    onCreateInvite: () => void;
    onEndInvite: () => void;
    onOpenChange: (open: boolean) => void;
    onClose: () => void;
};

export function InviteModal({
    open,
    shareOpen,
    inviteeEmail,
    inviteCode,
    isConnecting,
    groups,
    defaultGroupId,
    shareGroupId,
    onShareGroupIdChange,
    onShareGroup,
    onCreateInvite,
    onEndInvite,
    onOpenChange,
    onClose,
}: InviteModalProps) {
    const inviteLink = inviteCode
        ? `${window.location.origin}/invite?code=${inviteCode}`
        : "";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        {shareOpen ? "Share access" : "Invite access"}
                    </DialogTitle>
                    <DialogDescription>
                        {shareOpen
                            ? "Choose a group to share with the connected user."
                            : "Share a secure link to grant access to a group."}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {shareOpen ? (
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Connected user
                                </div>
                                <div className="text-sm font-semibold text-foreground">
                                    {inviteeEmail ?? "Connected user"}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="share-group-modal">
                                    Group to share
                                </Label>
                                <Select
                                    value={
                                        shareGroupId ??
                                        defaultGroupId ??
                                        undefined
                                    }
                                    onValueChange={onShareGroupIdChange}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select a group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {groups.map((group) => (
                                            <SelectItem
                                                key={group.id}
                                                value={group.id}
                                            >
                                                {group.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    onClick={onShareGroup}
                                    disabled={!shareGroupId && !defaultGroupId}
                                >
                                    Share group
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                You can revoke access later from the sharing
                                manager.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold">
                                        Invite link
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Send this link to connect securely.
                                    </p>
                                </div>
                                {inviteCode || isConnecting ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onEndInvite}
                                    >
                                        End invite
                                    </Button>
                                ) : null}
                            </div>
                            <div className="min-h-[44px] flex items-center">
                                {isConnecting ? (
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <CircularProgress />
                                        Creating invite...
                                    </div>
                                ) : inviteCode ? (
                                    <div className="w-full min-w-0">
                                        <TextLabel
                                            content={inviteLink}
                                            showCopyButton
                                            className="max-w-full"
                                        />
                                    </div>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        onClick={onCreateInvite}
                                    >
                                        Create invite
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {inviteCode
                                    ? "Keep this window open until they connect."
                                    : "Create an invite to start sharing."}
                            </p>
                        </div>
                    )}
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
