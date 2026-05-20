import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";

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
        <Modal
            opened={open}
            onClose={() => onOpenChange(false)}
            centered
            withinPortal={false}
            size="sm"
            title="New Group"
        >
            <Stack gap="md">
                <Text c="dimmed" size="sm">
                    Create a group to control what you share.
                </Text>
                <TextInput
                    label="Group name"
                    id="group-name"
                    value={name}
                    onChange={(event) => onNameChange(event.currentTarget.value)}
                    placeholder="e.g. Friends"
                />
                <Group justify="flex-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit}>Create group</Button>
                </Group>
            </Stack>
        </Modal>
    );
}
