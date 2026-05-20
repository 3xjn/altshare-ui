import { ActionIcon, Menu } from "@mantine/core";
import { Ellipsis } from "lucide-react";
import type { Account } from "@/types/account";
import { AccountRowMenuItems } from "@/components/accounts/AccountRowMenuItems";

type AccountRowMenuProps = {
    account: Account;
    onEdit: (account: Account) => void;
    onDelete: (account: Account) => void;
};

export function AccountRowMenu({ account, onEdit, onDelete }: AccountRowMenuProps) {
    return (
        <Menu position="bottom-end" shadow="md" width={180} withinPortal>
            <Menu.Target>
                <ActionIcon variant="subtle" size="lg" aria-label="Open account actions" data-no-row-select="true">
                    <Ellipsis size={18} />
                </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
                <AccountRowMenuItems account={account} onEdit={onEdit} onDelete={onDelete} />
            </Menu.Dropdown>
        </Menu>
    );
}
