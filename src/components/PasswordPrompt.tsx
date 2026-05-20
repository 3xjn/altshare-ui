import { Button, Modal, PasswordInput, Stack } from "@mantine/core";
import { useState } from "react";

export const PasswordPrompt = ({
  onConfirm,
  onPasswordEntered,
}: {
  onConfirm: () => void;
  onPasswordEntered: (password: string) => Promise<void>;
}) => {
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    try {
      await onPasswordEntered(password);
      onConfirm();
    } catch (error) {
      console.error("Password verification failed:", error);
    }
  };

  return (
    <Modal
      opened
      onClose={() => {}}
      centered
      withinPortal={false}
      title="Enter Your Password"
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
    >
      <Stack gap="md">
        <PasswordInput
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          placeholder="Password"
        />
        <Button onClick={handleSubmit} fullWidth>
          Continue
        </Button>
      </Stack>
    </Modal>
  );
};
