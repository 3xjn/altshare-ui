import {
    Button,
    Group,
    Loader,
    Modal,
    Paper,
    Stack,
    Text,
} from "@mantine/core";
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
        <Modal
            opened={open}
            onClose={() => onOpenChange(false)}
            centered
            withinPortal={false}
            size="xl"
            title="Sharing"
        >
            <Stack gap="md">
                <Text c="dimmed" size="sm">
                    Manage access you have granted to your groups.
                </Text>
                <Group justify="space-between" align="flex-start">
                    <div>
                        <Text size="sm" fw={600}>
                            Active shares
                        </Text>
                        <Text size="sm" c="dimmed">
                            These are the groups you have shared with others.
                        </Text>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRefresh}
                        disabled={isLoading}
                    >
                        Refresh
                    </Button>
                </Group>
                {revokeTarget ? (
                    <Paper
                        withBorder
                        radius="md"
                        p="md"
                        className="border-destructive/30 bg-destructive/5"
                    >
                        <Stack gap="sm">
                            <Text size="sm" fw={600}>
                                Revoke access for {revokeTarget.sharedWithEmail}?
                            </Text>
                            <Text size="sm" c="dimmed">
                                This stops future access. If they already saved data
                                locally, it will remain on their device.
                            </Text>
                            <Group justify="flex-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onRevokeCancel}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    color="red"
                                    size="sm"
                                    onClick={onRevokeConfirm}
                                    disabled={isRevoking}
                                    loading={isRevoking}
                                >
                                    Revoke access
                                </Button>
                            </Group>
                        </Stack>
                    </Paper>
                ) : null}
                {isLoading ? (
                    <Group justify="center" gap="sm" py="xl">
                        <Loader size="sm" />
                        <Text size="sm" c="dimmed">
                            Loading shared access...
                        </Text>
                    </Group>
                ) : sharingRelationships.length > 0 ? (
                    <Stack gap="sm">
                        {sharingRelationships.map((relationship) => {
                            const createdAt = new Date(relationship.createdAt);
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
                                <Paper
                                    key={relationship.id}
                                    withBorder
                                    radius="md"
                                    p="md"
                                >
                                    <Group justify="space-between" align="flex-start">
                                        <div>
                                            <Text size="sm" fw={600}>
                                                {groupLabel}
                                            </Text>
                                            <Text size="sm" c="dimmed">
                                                Shared with {relationship.sharedWithEmail}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Shared on {createdLabel}
                                            </Text>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                onSelectRevokeTarget(relationship)
                                            }
                                            disabled={isRevoking}
                                        >
                                            Revoke
                                        </Button>
                                    </Group>
                                </Paper>
                            );
                        })}
                    </Stack>
                ) : (
                    <Paper withBorder radius="md" p="lg" className="border-dashed">
                        <Text size="sm" c="dimmed">
                            No active shares yet. Use Invite to share a group.
                        </Text>
                    </Paper>
                )}
                <Text size="xs" c="dimmed">
                    Revoking access stops future sync. If someone saved data locally,
                    it will remain on their device.
                </Text>
            </Stack>
        </Modal>
    );
}
