import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/ui/progress";
import type { SharingRelationship } from "@/services/AccountApi";

type SharingModalProps = {
    open: boolean;
    isLoading: boolean;
    sharingRelationships: SharingRelationship[];
    groupLookup: Map<string, string>;
    revokeTarget: SharingRelationship | null;
    isRevoking: boolean;
    onOpenChange: (open: boolean) => void;
    onRefresh: () => void;
    onRevokeCancel: () => void;
    onRevokeConfirm: () => void;
    onSelectRevokeTarget: (relationship: SharingRelationship) => void;
};

export function SharingModal({
    open,
    isLoading,
    sharingRelationships,
    groupLookup,
    revokeTarget,
    isRevoking,
    onOpenChange,
    onRefresh,
    onRevokeCancel,
    onRevokeConfirm,
    onSelectRevokeTarget,
}: SharingModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Sharing</DialogTitle>
                    <DialogDescription>
                        Manage access you have granted to your groups.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold">
                                Active shares
                            </div>
                            <p className="text-sm text-muted-foreground">
                                These are the groups you have shared with
                                others.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRefresh}
                            disabled={isLoading}
                        >
                            Refresh
                        </Button>
                    </div>
                    {revokeTarget ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                            <div className="text-sm font-semibold">
                                Revoke access for{" "}
                                {revokeTarget.sharedWithEmail}?
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                This stops future access. If they already saved
                                data locally, it will remain on their device.
                            </p>
                            <div className="mt-3 flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onRevokeCancel}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={onRevokeConfirm}
                                    disabled={isRevoking}
                                >
                                    {isRevoking
                                        ? "Revoking..."
                                        : "Revoke access"}
                                </Button>
                            </div>
                        </div>
                    ) : null}
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
                            <CircularProgress />
                            Loading shared access...
                        </div>
                    ) : sharingRelationships.length > 0 ? (
                        <div className="space-y-3">
                            {sharingRelationships.map((relationship) => {
                                const createdAt = new Date(
                                    relationship.createdAt
                                );
                                const createdLabel = Number.isNaN(
                                    createdAt.getTime()
                                )
                                    ? "Unknown"
                                    : createdAt.toLocaleDateString();
                                const groupLabel =
                                    relationship.groupName ||
                                    groupLookup.get(relationship.groupId) ||
                                    "Group";

                                return (
                                    <div
                                        key={relationship.id}
                                        className="flex items-start justify-between gap-3 rounded-lg border px-4 py-3"
                                    >
                                        <div>
                                            <div className="text-sm font-semibold text-foreground">
                                                {groupLabel}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Shared with{" "}
                                                {relationship.sharedWithEmail}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Shared on {createdLabel}
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                onSelectRevokeTarget(
                                                    relationship
                                                )
                                            }
                                            disabled={isRevoking}
                                        >
                                            Revoke
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                            No active shares yet. Use Invite to share a group.
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Revoking access stops future sync. If someone saved data
                        locally, it will remain on their device.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
