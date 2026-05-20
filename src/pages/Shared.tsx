import { Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { InviteModal } from "@/components/accounts/InviteModal";
import { SharingModal } from "@/components/accounts/SharingModal";
import { useToast } from "@/hooks/use-toast";
import { useAccountsLifecycle } from "@/pages/accounts/useAccountsLifecycle";
import { useGroupKeyResolver } from "@/pages/accounts/useGroupKeyResolver";
import { useInviteSharingOrchestration } from "@/pages/accounts/useInviteSharingOrchestration";
import { useAccountStore } from "@/stores/AccountStore";

export function Shared() {
    const {
        isAuthenticated,
        currentPassword,
        encryptedMasterKey,
        groups,
        groupKeys,
        defaultGroupId,
        loadGroups,
        loadAccounts,
        loadSharedAccounts,
        getRanks,
    } = useAccountStore();
    const { toast } = useToast();

    const groupLookup = useMemo(
        () => new Map(groups.map((group) => [group.id, group.name])),
        [groups]
    );

    useAccountsLifecycle({
        isAuthenticated,
        currentPassword,
        loadGroups,
        loadAccounts,
        loadSharedAccounts,
        getRanks,
        toast,
    });

    const resolveGroupKey = useGroupKeyResolver({
        defaultGroupId,
        groupKeys,
        loadGroups,
        encryptedMasterKey,
        currentPassword,
    });

    const {
        isConnecting,
        shareOpen,
        inviteModalOpen,
        sharingModalOpen,
        sharingRelationships,
        isSharingLoading,
        revokeTarget,
        isRevokingShare,
        shareGroupId,
        inviteeEmail,
        inviteCode,
        setInviteModalOpen,
        setSharingModalOpen,
        setRevokeTarget,
        setShareGroupId,
        loadSharingRelationships,
        handleRevokeShare,
        startInviteSession,
        clearInviteSession,
        handleAccountShare,
    } = useInviteSharingOrchestration({
        isTestMode: false,
        activeGroupId: "all",
        defaultGroupId,
        resolveGroupKey,
        toast,
    });

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="flex-end">
                <div>
                    <Text size="xl" fw={700}>Shared access</Text>
                    <Text c="dimmed" size="sm">Invite people and manage the access you have granted.</Text>
                </div>
                <Group>
                    <Button onClick={() => void startInviteSession()}>Create invite</Button>
                    <Button variant="outline" onClick={() => setSharingModalOpen(true)}>Manage sharing</Button>
                </Group>
            </Group>

            <Paper withBorder radius="lg" p="xl">
                <Stack gap="sm">
                    <Text fw={600}>Sharing workspace</Text>
                    <Text c="dimmed" size="sm">
                        Create a secure invite to share a group, or review and revoke existing access from the sharing manager.
                    </Text>
                </Stack>
            </Paper>

            <InviteModal
                open={inviteModalOpen}
                onOpenChange={(open) => {
                    setInviteModalOpen(open);
                    if (!open) {
                        void clearInviteSession();
                    }
                }}
                onClose={() => setInviteModalOpen(false)}
                shareOpen={shareOpen}
                inviteeEmail={inviteeEmail}
                inviteCode={inviteCode}
                isConnecting={isConnecting}
                groups={groups}
                defaultGroupId={defaultGroupId}
                shareGroupId={shareGroupId}
                onShareGroupIdChange={setShareGroupId}
                onShareGroup={handleAccountShare}
                onCreateInvite={() => void startInviteSession()}
                onEndInvite={() => void clearInviteSession()}
            />

            <SharingModal
                open={sharingModalOpen}
                onOpenChange={(open) => {
                    setSharingModalOpen(open);
                    if (!open) {
                        setRevokeTarget(null);
                    }
                }}
                isLoading={isSharingLoading}
                sharingRelationships={sharingRelationships}
                groupLookup={groupLookup}
                revokeTarget={revokeTarget}
                isRevoking={isRevokingShare}
                onRefresh={() => void loadSharingRelationships()}
                onRevokeCancel={() => setRevokeTarget(null)}
                onRevokeConfirm={handleRevokeShare}
                onSelectRevokeTarget={setRevokeTarget}
            />
        </Stack>
    );
}
