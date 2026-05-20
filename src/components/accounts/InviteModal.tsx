import {
    Button,
    Group,
    Loader,
    Modal,
    NativeSelect,
    Paper,
    Stack,
    Text,
} from "@mantine/core";
import { TextLabel } from "@/components/ui/text-label";
import type { AccountGroup } from "@/types/account";

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
    const resolvedShareGroupId = shareGroupId ?? defaultGroupId ?? "";

    return (
        <Modal
            opened={open}
            onClose={() => onOpenChange(false)}
            centered
            withinPortal={false}
            size="xl"
            title={shareOpen ? "Share access" : "Invite access"}
        >
            <Stack gap="md">
                <Text c="dimmed" size="sm">
                    {shareOpen
                        ? "Choose a group to share with the connected user."
                        : "Share a secure link to grant access to a group."}
                </Text>
                {shareOpen ? (
                    <Paper withBorder radius="md" p="md">
                        <Stack gap="md">
                            <div>
                                <Text size="xs" fw={600} c="dimmed" className="uppercase tracking-wide">
                                    Connected user
                                </Text>
                                <Text size="sm" fw={600}>
                                    {inviteeEmail ?? "Connected user"}
                                </Text>
                            </div>
                            <NativeSelect
                                label="Group to share"
                                id="share-group-modal"
                                value={resolvedShareGroupId}
                                onChange={(event) =>
                                    onShareGroupIdChange(
                                        event.currentTarget.value
                                    )
                                }
                            >
                                <option value="">Select a group</option>
                                {groups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </NativeSelect>
                            <Group justify="flex-end">
                                <Button
                                    onClick={onShareGroup}
                                    disabled={!resolvedShareGroupId}
                                >
                                    Share group
                                </Button>
                            </Group>
                            <Text size="xs" c="dimmed">
                                You can revoke access later from the sharing manager.
                            </Text>
                        </Stack>
                    </Paper>
                ) : (
                    <Paper withBorder radius="md" p="md">
                        <Stack gap="sm">
                            <Group justify="space-between" align="flex-start">
                                <div>
                                    <Text size="sm" fw={600}>
                                        Invite link
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        Send this link to connect securely.
                                    </Text>
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
                            </Group>
                            <div className="flex min-h-11 items-center">
                                {isConnecting ? (
                                    <Group gap="sm">
                                        <Loader size="sm" />
                                        <Text size="sm" c="dimmed">
                                            Creating invite...
                                        </Text>
                                    </Group>
                                ) : inviteCode ? (
                                    <div className="min-w-0 w-full">
                                        <TextLabel
                                            content={inviteLink}
                                            showCopyButton
                                            className="max-w-full"
                                        />
                                    </div>
                                ) : (
                                    <Button onClick={onCreateInvite}>
                                        Create invite
                                    </Button>
                                )}
                            </div>
                            <Text size="xs" c="dimmed">
                                {inviteCode
                                    ? "Keep this window open until they connect."
                                    : "Create an invite to start sharing."}
                            </Text>
                        </Stack>
                    </Paper>
                )}
                <Group justify="flex-end">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
