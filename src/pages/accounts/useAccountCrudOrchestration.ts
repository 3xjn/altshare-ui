import { useRef, useState } from "react";
import type { Toast } from "@/hooks/use-toast";
import { accountApi } from "@/services/AccountApi";
import type { Account } from "@/types/account";
import { encryptAccountData } from "@/utils/encryption";
import {
    parseAccountMutationFormData,
    type AccountMutationInput,
} from "@/pages/accounts/accountFormData";

type ResolveGroupKey = (
    groupId?: string | null
) => Promise<{ groupId: string; groupKey: string }>;

type UseAccountCrudOrchestrationArgs = {
    currentPassword: string | null;
    encryptedMasterKey: string | null;
    defaultGroupId: string | null;
    setCurrentPassword: (password: string) => void;
    loadAccounts: () => Promise<void>;
    getRanks: () => Promise<void>;
    resolveGroupKey: ResolveGroupKey;
    toast: (args: Toast) => void;
};

export function useAccountCrudOrchestration({
    currentPassword,
    encryptedMasterKey,
    defaultGroupId,
    setCurrentPassword,
    loadAccounts,
    getRanks,
    resolveGroupKey,
    toast,
}: UseAccountCrudOrchestrationArgs) {
    const [createOpen, setCreateOpen] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const accountFormRef = useRef<HTMLFormElement | null>(null);

    const handleSetCreateOpen = (open: boolean) => {
        setCreateOpen(open);
        if (!open) {
            setEditingAccount(null);
        }
    };

    const handleAddAccount = async (accountData: AccountMutationInput) => {
        const { groupId, ...payload } = accountData;
        const { groupId: resolvedGroupId, groupKey } = await resolveGroupKey(groupId);

        const encryptedData = await encryptAccountData(
            JSON.stringify(payload),
            groupKey
        );

        await accountApi.addAccount({
            encryptedData,
            groupId: resolvedGroupId,
        });

        await loadAccounts();
        void getRanks();

        toast({
            title: "Success",
            description: "Account added successfully.",
        });

        handleSetCreateOpen(false);
    };

    const handleEditSubmit = async (accountData: AccountMutationInput) => {
        if (!editingAccount?.id) {
            throw new Error("Missing account ID");
        }

        const { groupId, ...payload } = accountData;
        const { groupId: resolvedGroupId, groupKey } = await resolveGroupKey(groupId);

        const encryptedData = await encryptAccountData(
            JSON.stringify(payload),
            groupKey
        );

        await accountApi.editAccount(editingAccount.id, {
            encryptedData,
            groupId: resolvedGroupId,
        });

        await loadAccounts();
        void getRanks();

        toast({
            title: "Success",
            description: "Account updated successfully.",
        });

        setEditingAccount(null);
        handleSetCreateOpen(false);
    };

    const submitMutation = async (accountData: AccountMutationInput) => {
        if (!currentPassword || !encryptedMasterKey) {
            setShowPasswordPrompt(true);
            return;
        }

        if (editingAccount) {
            await handleEditSubmit(accountData);
        } else {
            await handleAddAccount(accountData);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const accountData = parseAccountMutationFormData(formData);

        try {
            await submitMutation(accountData);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "An unknown error occurred",
            });
        }
    };

    const handlePasswordSubmit = async (enteredPassword: string) => {
        try {
            setCurrentPassword(enteredPassword);
            await loadAccounts();
            setShowPasswordPrompt(false);

            const form = accountFormRef.current;
            if (form) {
                const formData = new FormData(form);
                const accountData = parseAccountMutationFormData(formData);

                if (editingAccount) {
                    await handleEditSubmit(accountData);
                } else {
                    await handleAddAccount(accountData);
                }
            }
        } catch (error) {
            console.log((error as Error).message);
            toast({
                variant: "destructive",
                title: "Invalid Password",
                description: "The password you entered is incorrect",
            });
        }
    };

    const handleEdit = (account: Account) => {
        setEditingAccount(account);
        handleSetCreateOpen(true);
    };

    const handleDelete = async (account: Account) => {
        if (!account.id) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Cannot delete account without ID.",
            });
            return;
        }

        try {
            await accountApi.deleteAccount(account.id);
            await loadAccounts();
            void getRanks();
            toast({
                title: "Success",
                description: "Account deleted successfully.",
            });
        } catch (error) {
            console.error("Failed to delete account:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete account. Please try again.",
            });
        }
    };

    const editingDefaultValues = editingAccount
        ? {
              game: editingAccount.game ?? "None",
              username: editingAccount.username,
              password: editingAccount.password,
              notes: editingAccount.notes ?? "",
              gameData: editingAccount.gameData ?? {},
              groupId: editingAccount.groupId ?? defaultGroupId ?? undefined,
          }
        : undefined;

    return {
        createOpen,
        showPasswordPrompt,
        editingAccount,
        editingDefaultValues,
        accountFormRef,
        setShowPasswordPrompt,
        handleSetCreateOpen,
        handleSubmit,
        handlePasswordSubmit,
        handleEdit,
        handleDelete,
    };
}
