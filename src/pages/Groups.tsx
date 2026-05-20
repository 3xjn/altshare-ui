import { useEffect, useMemo, useState } from "react";
import {
    ActionIcon,
    Button,
    Group,
    Modal,
    Paper,
    Stack,
    Text,
    TextInput,
} from "@mantine/core";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAccountStore } from "@/stores/AccountStore";

export function Groups() {
    const {
        isAuthenticated,
        groups,
        decryptedAccounts,
        currentPassword,
        loadGroups,
        loadAccounts,
        createGroup,
        renameGroup,
        deleteGroup,
    } = useAccountStore();
    const { toast } = useToast();
    const [createOpen, setCreateOpen] = useState(false);
    const [editGroupId, setEditGroupId] = useState<string | null>(null);
    const [draftName, setDraftName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const groupStats = useMemo(() => {
        const defaultGroupId = groups.find((entry) => entry.usesMasterKey)?.id;
        return groups.map((group) => ({
            ...group,
            accountCount: decryptedAccounts.filter(
                (account) => !account.isShared && (account.groupId ?? defaultGroupId) === group.id
            ).length,
        }));
    }, [decryptedAccounts, groups]);

    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        void loadGroups();

        if (currentPassword) {
            void loadAccounts();
        }
    }, [currentPassword, isAuthenticated, loadAccounts, loadGroups]);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const openCreateModal = () => {
        setDraftName("");
        setCreateOpen(true);
    };

    const openRenameModal = (groupId: string, groupName: string) => {
        setEditGroupId(groupId);
        setDraftName(groupName);
    };

    const handleCreate = async () => {
        const trimmedName = draftName.trim();
        if (!trimmedName) {
            toast({ variant: "destructive", title: "Name required", description: "Enter a group name." });
            return;
        }
        try {
            setIsSubmitting(true);
            const created = await createGroup(trimmedName);
            if (!created) {
                throw new Error("Unable to create group.");
            }
            setCreateOpen(false);
            setDraftName("");
            toast({ title: "Group created", description: `${trimmedName} is ready.` });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to create group.";
            toast({ variant: "destructive", title: "Create failed", description: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRename = async () => {
        if (!editGroupId) return;
        const trimmedName = draftName.trim();
        if (!trimmedName) {
            toast({ variant: "destructive", title: "Name required", description: "Enter a group name." });
            return;
        }
        try {
            setIsSubmitting(true);
            await renameGroup(editGroupId, trimmedName);
            setEditGroupId(null);
            setDraftName("");
            toast({ title: "Group renamed", description: `${trimmedName} updated.` });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to rename group.";
            toast({ variant: "destructive", title: "Rename failed", description: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (groupId: string, groupName: string) => {
        const confirmed = window.confirm(`Delete ${groupName}? This only works if it is empty and not shared.`);
        if (!confirmed) return;

        try {
            await deleteGroup(groupId);
            await loadGroups();
            toast({ title: "Group deleted", description: `${groupName} was removed.` });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to delete group.";
            toast({ variant: "destructive", title: "Delete failed", description: message });
        }
    };

    return (
        <Stack gap="md" maw={820}>
            <Group justify="space-between" align="flex-end" gap="md" wrap="wrap">
                <div>
                    <Text size="xl" fw={700}>Groups</Text>
                    <Text c="dimmed" size="sm">Manage how your accounts are organized.</Text>
                </div>
                <Button size="sm" leftSection={<Plus size={16} />} onClick={openCreateModal}>
                    New group
                </Button>
            </Group>

            <Paper withBorder radius="lg" p={0} role="list" aria-label="Groups">
                {groupStats.map((group, index) => (
                    <Group
                        key={group.id}
                        role="listitem"
                        justify="space-between"
                        align="center"
                        gap="sm"
                        wrap="nowrap"
                        p="sm"
                        style={{
                            borderBottom:
                                index === groupStats.length - 1
                                    ? undefined
                                    : "1px solid var(--mantine-color-default-border)",
                        }}
                    >
                        <Stack gap={2} className="min-w-0">
                            <Group
                                gap={4}
                                wrap="nowrap"
                                data-testid={`group-title-${group.id}`}
                                className="min-w-0"
                            >
                                <Text fw={600} truncate="end">{group.name}</Text>
                                {!group.usesMasterKey ? (
                                    <ActionIcon
                                        variant="subtle"
                                        size="sm"
                                        aria-label={`Rename ${group.name}`}
                                        onClick={() => openRenameModal(group.id, group.name)}
                                    >
                                        <Pencil size={14} />
                                    </ActionIcon>
                                ) : null}
                            </Group>
                            <Text c="dimmed" size="sm">
                                {group.accountCount} account{group.accountCount === 1 ? "" : "s"}
                                {group.usesMasterKey ? " • Default group" : ""}
                            </Text>
                        </Stack>

                        {!group.usesMasterKey ? (
                            <ActionIcon
                                color="red"
                                variant="subtle"
                                aria-label={`Delete ${group.name}`}
                                onClick={() => void handleDelete(group.id, group.name)}
                            >
                                <Trash2 size={18} />
                            </ActionIcon>
                        ) : null}
                    </Group>
                ))}
            </Paper>

            <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Create group" centered>
                <Stack>
                    <TextInput label="Group name" value={draftName} onChange={(event) => setDraftName(event.currentTarget.value)} />
                    <Group justify="flex-end">
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={() => void handleCreate()} loading={isSubmitting}>Create group</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={editGroupId !== null} onClose={() => setEditGroupId(null)} title="Rename group" centered>
                <Stack>
                    <TextInput label="Group name" value={draftName} onChange={(event) => setDraftName(event.currentTarget.value)} />
                    <Group justify="flex-end">
                        <Button variant="outline" onClick={() => setEditGroupId(null)}>Cancel</Button>
                        <Button onClick={() => void handleRename()} loading={isSubmitting}>Save changes</Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}
