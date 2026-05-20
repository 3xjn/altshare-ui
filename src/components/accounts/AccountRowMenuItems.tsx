import { Menu } from "@mantine/core";
import { Pencil, Trash2 } from "lucide-react";
import type { Account } from "@/types/account";

type AccountRowMenuItemsProps = {
    account: Account;
    onEdit: (account: Account) => void;
    onDelete: (account: Account) => void;
};

export function AccountRowMenuItems({ account, onEdit, onDelete }: AccountRowMenuItemsProps) {
    return (
        <>
            <Menu.Item leftSection={<Pencil size={16} />} onClick={() => onEdit(account)}>
                Edit account
            </Menu.Item>
            <Menu.Item color="red" leftSection={<Trash2 size={16} />} onClick={() => onDelete(account)}>
                Delete account
            </Menu.Item>
        </>
    );
}
