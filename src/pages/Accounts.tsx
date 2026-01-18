import "../services/SignalR";
import { TextLabel } from "@/components/ui/text-label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, RefreshCcw, Settings, Lock, Share } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Account, useAccountStore } from "@/stores/AccountStore";
import { decryptMasterKey, encryptAccountData } from "@/utils/encryption";
import { accountApi } from "@/services/AccountApi";
import { useToast } from "@/hooks/use-toast";
import { PasswordPrompt } from "@/components/PasswordPrompt";
import { ExpandableNotes } from "@/components/ui/expandable-notes";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignalRService } from "@/services/SignalR";
import { CircularProgress } from "@/components/ui/progress";
import { PeerService } from "@/services/PeerService";
import AddAccountDialog from "@/components/AddAccountDialog";
import { Stack } from "@/components/ui/stack";
import { getImageFromRank } from "@/utils/getImageFromRank";
import { base64ToArrayBuffer } from "@/utils/crypto";

export function Accounts() {
    const {
        isAuthenticated,
        currentPassword,
        setCurrentPassword,
        encryptedMasterKey,
        groups,
        groupKeys,
        defaultGroupId,
        decryptedAccounts,
        loadGroups,
        loadAccounts,
        loadSharedAccounts,
        createGroup,
        getRanks,
        logout,
    } = useAccountStore();
    const [isLoading, setIsLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [inviteOpen, setInviteOpen] = useState(false);
    const { toast } = useToast();
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [signalRService, setSignalRService] = useState<SignalRService | null>(
        null
    );
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [peer, setPeer] = useState<PeerService | null>(null);
    const [shareOpen, setShareOpen] = useState(false);
    const [shareGroupId, setShareGroupId] = useState<string | null>(null);
    const [inviteeEmail, setInviteeEmail] = useState<string | null>(null);
    const [activeGroupId, setActiveGroupId] = useState<string>("all");
    const [newGroupOpen, setNewGroupOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(
        new Set()
    );
    const [contextMenuAccountId, setContextMenuAccountId] = useState<
        string | null
    >(null);
    const [searchParams] = useSearchParams();
    const isTestMode = searchParams.get("test") === "true";

    const groupLookup = useMemo(() => {
        return new Map(groups.map(group => [group.id, group.name]));
    }, [groups]);

    const lastSelectedIndexRef = useRef<number | null>(null);

    useEffect(() => {
        const initializeAccounts = async () => {
            try {
                if (currentPassword) {
                    await loadGroups();
                    await loadAccounts();
                    await loadSharedAccounts();
                    getRanks();
                }
            } catch (error) {
                console.error("Failed to load accounts:", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description:
                        "Failed to load accounts. Please try logging in again.",
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (isAuthenticated) {
            initializeAccounts();
        } else {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        return () => {
            if (signalRService && !inviteOpen) {
                signalRService.disconnect();
            }
        };
    }, [signalRService, inviteOpen]);

    useEffect(() => {
        if (!shareOpen) return;

        const initialGroupId =
            activeGroupId !== "all" && activeGroupId !== "shared"
                ? activeGroupId
                : defaultGroupId;

        setShareGroupId(initialGroupId ?? null);
    }, [shareOpen, activeGroupId, defaultGroupId]);

    useEffect(() => {
        const validIds = new Set(
            decryptedAccounts
                .filter((account) => !account.isShared && account.id)
                .map((account) => account.id)
        );

        setSelectedAccountIds((prev) => {
            if (prev.size === 0) return prev;

            const next = new Set<string>();
            prev.forEach((id) => {
                if (validIds.has(id)) {
                    next.add(id);
                }
            });

            return next.size === prev.size ? prev : next;
        });

        setContextMenuAccountId((prev) =>
            prev && validIds.has(prev) ? prev : null
        );
    }, [decryptedAccounts]);

    const handleRefresh = async () => {
        if (!currentPassword) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Please log in again to refresh accounts.",
            });
            return;
        }

        setIsLoading(true);
        try {
            await loadGroups();
            await loadAccounts();
            await loadSharedAccounts();
            await getRanks();

            toast({
                title: "Success",
                description: "Accounts refreshed successfully.",
            });
        } catch (error) {
            console.error("Failed to refresh accounts:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description:
                    "Failed to refresh accounts. Please try logging in again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportData = () => {
        const ownedAccounts = decryptedAccounts.filter(
            (account) => !account.isShared
        );

        if (ownedAccounts.length === 0) {
            toast({
                variant: "destructive",
                title: "No accounts to export",
                description: "Add an account before exporting.",
            });
            return;
        }

        const confirmed = window.confirm(
            "This exports your accounts in plain text (including passwords). Store the file securely. Continue?"
        );
        if (!confirmed) return;

        const exportedAt = new Date().toISOString();
        const payload = {
            version: 1,
            exportedAt,
            groups: groups.map((group) => ({
                id: group.id,
                name: group.name,
                usesMasterKey: group.usesMasterKey,
            })),
            accounts: ownedAccounts.map((account) => {
                const resolvedGroupId =
                    account.groupId ?? defaultGroupId ?? null;
                return {
                    username: account.username,
                    password: account.password,
                    notes: account.notes ?? "",
                    game: account.game ?? "",
                    groupId: resolvedGroupId,
                    groupName: resolvedGroupId
                        ? groupLookup.get(resolvedGroupId) ?? "Personal"
                        : null,
                };
            }),
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `altshare-export-${exportedAt.replace(
            /[:.]/g,
            "-"
        )}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
            title: "Export ready",
            description: "Your JSON export has been downloaded.",
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const accountData = {
            username: formData.get("username") as string,
            password: formData.get("password") as string,
            notes: (formData.get("notes") as string) || "",
            game: (formData.get("game") as string) || "",
            groupId: (formData.get("groupId") as string) || undefined,
        };

        try {
            if (!currentPassword || !encryptedMasterKey) {
                setShowPasswordPrompt(true);
                return;
            }

            if (editingAccount) {
                await handleEditSubmit(accountData);
            } else {
                await handleAddAccount(accountData);
            }
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

    const handleAddAccount = async (accountData: {
        username: string;
        password: string;
        notes: string;
        game?: string;
        groupId?: string;
    }) => {
        const { groupId, ...payload } = accountData;
        const { groupId: resolvedGroupId, groupKey } = await resolveGroupKey(groupId);

        const encryptedData = await encryptAccountData(
            JSON.stringify(payload),
            groupKey
        );

        await accountApi.addAccount({
            encryptedData,
            groupId: resolvedGroupId
        });

        await loadAccounts();
        getRanks();

        toast({
            title: "Success",
            description: "Account added successfully.",
        });

        handleSetCreateOpen(false);
    };

    const handleEditSubmit = async (accountData: {
        username: string;
        password: string;
        notes: string;
        game?: string;
        groupId?: string;
    }) => {
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
            groupId: resolvedGroupId
        });

        await loadAccounts();
        getRanks();

        toast({
            title: "Success",
            description: "Account updated successfully.",
        });

        setEditingAccount(null);
        handleSetCreateOpen(false);
    };

    const handlePasswordSubmit = async (enteredPassword: string) => {
        try {
            setCurrentPassword(enteredPassword);
            await loadAccounts();
            setShowPasswordPrompt(false);

            const form = document.querySelector("form") as HTMLFormElement;
            if (form) {
                const formData = new FormData(form);
                const accountData = {
                    username: formData.get("username") as string,
                    password: formData.get("password") as string,
                    notes: (formData.get("notes") as string) || "",
                    game: (formData.get("game") as string) || "",
                    groupId: (formData.get("groupId") as string) || undefined,
                };

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

    const handleSetCreateOpen = (open: boolean) => {
        setCreateOpen(open);
        if (!open) {
            setEditingAccount(null);
        }
    };

    const clearSelection = () => {
        lastSelectedIndexRef.current = null;
        setContextMenuAccountId(null);
        setSelectedAccountIds(new Set());
    };

    const shouldIgnoreRowClick = (event: React.MouseEvent) => {
        const target = event.target as HTMLElement | null;
        if (!target) return false;
        return Boolean(
            target.closest(
                "button, a, input, textarea, select, [data-no-row-select='true']"
            )
        );
    };

    const handleRowMouseDown = (event: React.MouseEvent) => {
        if (event.button !== 0) return;
        if (shouldIgnoreRowClick(event)) return;
        event.preventDefault();
    };

    const handleRowClick = (
        event: React.MouseEvent,
        account: Account,
        orderedSelectableIds: string[]
    ) => {
        if (account.isShared || !account.id) return;
        if (shouldIgnoreRowClick(event)) return;

        const currentIndex = orderedSelectableIds.indexOf(account.id);
        if (currentIndex < 0) return;

        const isShift = event.shiftKey;
        const isMeta = event.metaKey || event.ctrlKey;

        setSelectedAccountIds((prev) => {
            let next = new Set(prev);
            if (isShift && lastSelectedIndexRef.current !== null) {
                const start = Math.min(
                    lastSelectedIndexRef.current,
                    currentIndex
                );
                const end = Math.max(
                    lastSelectedIndexRef.current,
                    currentIndex
                );
                const rangeIds = orderedSelectableIds.slice(start, end + 1);
                if (isMeta) {
                    rangeIds.forEach((id) => next.add(id));
                } else {
                    next = new Set(rangeIds);
                }
            } else if (isMeta) {
                if (next.has(account.id)) {
                    next.delete(account.id);
                } else {
                    next.add(account.id);
                }
            } else {
                next = new Set([account.id]);
            }
            return next;
        });

        lastSelectedIndexRef.current = currentIndex;
    };

    const handleRowContextMenu = (
        event: React.MouseEvent,
        account: Account,
        orderedSelectableIds: string[]
    ) => {
        if (account.isShared || !account.id) return;
        if (event.defaultPrevented) return;

        event.preventDefault();

        const currentIndex = orderedSelectableIds.indexOf(account.id);
        if (currentIndex >= 0) {
            lastSelectedIndexRef.current = currentIndex;
        }

        setSelectedAccountIds((prev) => {
            if (prev.has(account.id)) {
                return prev;
            }
            return new Set([account.id]);
        });

        setContextMenuAccountId(account.id);
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

    const handleInviteClick = async () => {
        if (isConnecting) return;
        setInviteOpen(true);
        setInviteCode(null);
        setInviteeEmail(null);

        if (searchParams.get("test") === "true") {
            setIsConnecting(true);
            setTimeout(() => {
                setIsConnecting(false);
                setInviteCode("test-invite-code-12345");
                setInviteeEmail("test-user@example.com");
            }, 1500);
            return;
        }

        try {
            setIsConnecting(true);
            let newPeer: PeerService | null = null;
            const service = new SignalRService({
                roomCreated: (roomId) => {
                    setInviteCode(roomId);
                    setIsConnecting(false);
                    service.roomId = roomId;
                },
                userJoined: () => {
                    if (newPeer) {
                        newPeer.initiate(true, service.roomId);
                    }
                },
                receiveSignal: (signal) => {
                    if (newPeer) {
                        newPeer.signal(signal);
                    }
                },
            });

            newPeer = new PeerService(service);
            newPeer.registerHandler("userInfo", (payload) => {
                setInviteeEmail(payload.email);
            });

            newPeer.registerHandler("verification", async (payload) => {
                try {
                    const { groupKey } = await resolveGroupKey(
                        payload.encryptedKey.groupId
                    );
                    const rawKeyBuffer = base64ToArrayBuffer(groupKey);
                    const hmacKey = await crypto.subtle.importKey(
                        "raw",
                        rawKeyBuffer,
                        { name: "HMAC", hash: "SHA-256" },
                        false,
                        ["sign"]
                    );
                    const theirSignature = base64ToArrayBuffer(
                        payload.signature
                    );
                    const mySignature = await crypto.subtle.sign(
                        "HMAC",
                        hmacKey,
                        base64ToArrayBuffer(payload.token)
                    );

                    const verified = new Uint8Array(theirSignature).every(
                        (value, index) =>
                            value === new Uint8Array(mySignature)[index]
                    );

                    if (!verified) {
                        throw new Error("Failed to verify account sharing");
                    }

                    await accountApi.createSharingRelationship({
                        sharedWithEmail: payload.encryptedKey.email,
                        groupId: payload.encryptedKey.groupId,
                        encryptedGroupKey: payload.encryptedKey.encryptedGroupKey,
                        iv: payload.encryptedKey.iv,
                        salt: payload.encryptedKey.salt,
                        tag: payload.encryptedKey.tag,
                    });

                    newPeer?.sendMessage("sharingConfirmation", { success: true });
                    toast({
                        title: "Success",
                        description: "Account sharing verified successfully.",
                    });
                    setShareOpen(false);
                } catch (error) {
                    console.error("Share verification failed:", error);
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Failed to verify account sharing.",
                    });
                }
            });

            newPeer.onConnect = () => {
                setInviteOpen(false);
                setShareOpen(true);
            };

            await service.connect();
            service.createRoom();
            setSignalRService(service);
            setPeer(newPeer);
        } catch (error) {
            console.error("Failed to establish connection:", error);
            toast({
                variant: "destructive",
                title: "Connection Failed",
                description:
                    "Failed to establish connection. Please try again.",
            });
            setIsConnecting(false);
        }
    };

    const resolveGroupKey = async (requestedGroupId?: string | null) => {
        const groupId = requestedGroupId || defaultGroupId;
        if (!groupId) {
            throw new Error("Missing group selection");
        }

        let groupKey = groupKeys[groupId];
        if (!groupKey) {
            await loadGroups();
            const refreshedGroupKey = useAccountStore.getState().groupKeys[groupId];
            if (refreshedGroupKey) {
                groupKey = refreshedGroupKey;
            }
        }

        if (!groupKey) {
            if (!encryptedMasterKey || !currentPassword) {
                throw new Error("Missing master key or password");
            }

            const decryptedMasterKey = await decryptMasterKey(
                encryptedMasterKey,
                currentPassword
            );
            if (!decryptedMasterKey.isUtf8Valid || !decryptedMasterKey.data) {
                throw new Error("Failed to decrypt master key");
            }

            if (groupId !== defaultGroupId) {
                throw new Error("Group key not loaded");
            }

            groupKey = decryptedMasterKey.data;
        }

        return { groupId, groupKey };
    };

    const handleAccountShare = async () => {
        if (!peer) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No active sharing session found.",
            });
            return;
        }

        try {
            const { groupId, groupKey } = await resolveGroupKey(shareGroupId);
            peer.sendMessage("groupKey", {
                groupId,
                key: groupKey,
            });
            setShareOpen(false);
        } catch (error) {
            console.error("Failed to share group key:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to share group key.",
            });
        }
    };

    const handleCreateGroup = async () => {
        const trimmedName = newGroupName.trim();
        if (!trimmedName) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Group name is required.",
            });
            return;
        }

        try {
            const created = await createGroup(trimmedName);
            if (!created) {
                throw new Error("Failed to create group");
            }

            setNewGroupOpen(false);
            setNewGroupName("");
            setActiveGroupId(created.id);
        } catch (error) {
            console.error("Failed to create group:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to create group.",
            });
        }
    };

    type AccountSection = {
        id: string;
        name: string;
        accounts: Account[];
    };

    const groupedSections = useMemo(() => {
        const fallbackGroupId = defaultGroupId ?? "personal";
        const fallbackGroupName =
            groupLookup.get(defaultGroupId ?? "") ?? "Personal";

        const sharedAccounts: Account[] = [];
        const groupMap = new Map<string, Account[]>();

        const addToGroup = (groupId: string, account: Account) => {
            const existing = groupMap.get(groupId) ?? [];
            existing.push(account);
            groupMap.set(groupId, existing);
        };

        for (const account of decryptedAccounts) {
            if (account.isShared) {
                sharedAccounts.push(account);
                continue;
            }

            const groupId = account.groupId ?? fallbackGroupId;
            addToGroup(groupId, account);
        }

        const resolveGroupName = (groupId: string) => {
            if (groupId === fallbackGroupId) {
                return fallbackGroupName;
            }
            return groupLookup.get(groupId) ?? "Group";
        };

        if (activeGroupId === "shared") {
            return sharedAccounts.length
                ? [{ id: "shared", name: "Shared", accounts: sharedAccounts }]
                : [];
        }

        if (activeGroupId !== "all") {
            const accounts = groupMap.get(activeGroupId) ?? [];
            return accounts.length
                ? [
                      {
                          id: activeGroupId,
                          name: resolveGroupName(activeGroupId),
                          accounts,
                      },
                  ]
                : [];
        }

        const orderedGroupIds: string[] = [];
        for (const group of groups) {
            if (groupMap.has(group.id)) {
                orderedGroupIds.push(group.id);
            }
        }
        for (const groupId of groupMap.keys()) {
            if (!orderedGroupIds.includes(groupId)) {
                orderedGroupIds.push(groupId);
            }
        }

        const sections: AccountSection[] = orderedGroupIds
            .map((groupId) => ({
                id: groupId,
                name: resolveGroupName(groupId),
                accounts: groupMap.get(groupId) ?? [],
            }))
            .filter((section) => section.accounts.length > 0);

        if (sharedAccounts.length > 0) {
            sections.push({
                id: "shared",
                name: "Shared",
                accounts: sharedAccounts,
            });
        }

        return sections;
    }, [activeGroupId, decryptedAccounts, groups, defaultGroupId, groupLookup]);

    const orderedSelectableIds = useMemo(() => {
        const ids: string[] = [];
        for (const section of groupedSections) {
            for (const account of section.accounts) {
                if (!account.isShared && account.id) {
                    ids.push(account.id);
                }
            }
        }
        return ids;
    }, [groupedSections]);

    useEffect(() => {
        lastSelectedIndexRef.current = null;
    }, [orderedSelectableIds]);

    const selectedAccounts = useMemo(() => {
        if (selectedAccountIds.size === 0) return [];
        return decryptedAccounts.filter(
            (account) =>
                !account.isShared &&
                account.id &&
                selectedAccountIds.has(account.id)
        );
    }, [decryptedAccounts, selectedAccountIds]);

    const selectedCount = selectedAccounts.length;

    const totalAccounts = groupedSections.reduce(
        (sum, section) => sum + section.accounts.length,
        0
    );

    const handleBulkMove = async (targetGroupId: string) => {
        if (selectedAccounts.length === 0) {
            toast({
                variant: "destructive",
                title: "No accounts selected",
                description: "Select accounts before moving them.",
            });
            return;
        }

        if (!targetGroupId) {
            toast({
                variant: "destructive",
                title: "Missing target group",
                description: "Choose a group to move accounts into.",
            });
            return;
        }

        try {
            const {
                groupId: resolvedGroupId,
                groupKey,
            } = await resolveGroupKey(targetGroupId);

            await Promise.all(
                selectedAccounts.map(async (account) => {
                    if (!account.id) return;
                    const currentGroupId =
                        account.groupId ?? defaultGroupId ?? null;
                    if (currentGroupId === resolvedGroupId) return;

                    const payload = {
                        username: account.username,
                        password: account.password,
                        notes: account.notes ?? "",
                        game: account.game ?? "",
                    };
                    const encryptedData = await encryptAccountData(
                        JSON.stringify(payload),
                        groupKey
                    );
                    await accountApi.editAccount(account.id, {
                        encryptedData,
                        groupId: resolvedGroupId,
                    });
                })
            );

            clearSelection();
            await loadAccounts();
            getRanks();
            toast({
                title: "Success",
                description: "Accounts moved successfully.",
            });
        } catch (error) {
            console.error("Failed to move accounts:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to move accounts.",
            });
        }
    };

    const handleBulkDelete = async () => {
        if (selectedAccounts.length === 0) {
            toast({
                variant: "destructive",
                title: "No accounts selected",
                description: "Select accounts before deleting them.",
            });
            return;
        }

        const confirmed = window.confirm(
            `Delete ${selectedAccounts.length} account${
                selectedAccounts.length === 1 ? "" : "s"
            }? This cannot be undone.`
        );
        if (!confirmed) return;

        try {
            await Promise.all(
                selectedAccounts.map((account) =>
                    account.id ? accountApi.deleteAccount(account.id) : null
                )
            );

            clearSelection();
            await loadAccounts();
            getRanks();
            toast({
                title: "Success",
                description: "Accounts deleted successfully.",
            });
        } catch (error) {
            console.error("Failed to delete accounts:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete accounts.",
            });
        }
    };

    const shareGroupName = useMemo(() => {
        if (!shareGroupId) {
            return groupLookup.get(defaultGroupId ?? "") ?? "Personal";
        }
        return groupLookup.get(shareGroupId) ?? "Personal";
    }, [shareGroupId, defaultGroupId, groupLookup]);

    if (!isAuthenticated && !isTestMode) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <img
                        className="rounded-md mb-2 w-[15%] h-[15%]"
                        src="./images/banner-light.png"
                    />
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleRefresh}
                            variant="outline"
                            size="sm"
                        >
                            <RefreshCcw />
                            Refresh
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleInviteClick}
                            disabled={isConnecting}
                        >
                            {isConnecting ? (
                                <>
                                    <svg
                                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <Share className="mr-2 h-4 w-4" />
                                    Invite
                                </>
                            )}
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger>
                                <Settings size={24} strokeWidth={1.5} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>
                                    My Account
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleExportData}
                                    className="cursor-pointer"
                                >
                                    Export data
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={logout}
                                    className="cursor-pointer"
                                >
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="rounded-lg border bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <Select
                                value={activeGroupId}
                                onValueChange={setActiveGroupId}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="All groups" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All groups</SelectItem>
                                    <SelectItem value="shared">Shared</SelectItem>
                                    {groups.map(group => (
                                        <SelectItem
                                            key={group.id}
                                            value={group.id}
                                        >
                                            {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setNewGroupOpen(true)}
                            >
                                New group
                            </Button>
                        </div>
                        {selectedCount > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        {selectedCount} selected
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-56"
                                >
                                    <DropdownMenuLabel>
                                        {selectedCount} selected
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                            Move to group
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                            {groups.length > 0 ? (
                                                groups.map((group) => (
                                                    <DropdownMenuItem
                                                        key={group.id}
                                                        onSelect={() =>
                                                            handleBulkMove(
                                                                group.id
                                                            )
                                                        }
                                                    >
                                                        {group.name}
                                                    </DropdownMenuItem>
                                                ))
                                            ) : (
                                                <DropdownMenuItem disabled>
                                                    No groups available
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuItem
                                        onSelect={handleBulkDelete}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        Delete selected
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={clearSelection}>
                                        Clear selection
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                    <div className="px-6">
                        <Table className="select-none">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[75px]">
                                        Game
                                    </TableHead>
                                    <TableHead className="w-[200px]">
                                        Username
                                    </TableHead>
                                    <TableHead className="w-[200px]">
                                        Password
                                    </TableHead>
                                    <TableHead className="w-[200px]">
                                        Rank
                                    </TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="w-[100px] text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32">
                                            <div className="flex items-center justify-center gap-3">
                                                <svg
                                                    className="animate-spin h-5 w-5 text-muted-foreground"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    ></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    ></path>
                                                </svg>
                                                <span className="text-sm text-muted-foreground">
                                                    Loading accounts...
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : totalAccounts === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32">
                                            <div className="flex flex-col items-center justify-center text-center">
                                                <h3 className="font-medium">
                                                    No accounts yet
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Add an account to get
                                                    started
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    groupedSections.map((section) => (
                                        <Fragment key={`section-${section.id}`}>
                                            <TableRow className="bg-muted/30">
                                                <TableCell
                                                    colSpan={6}
                                                    className="text-sm font-semibold text-foreground"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span>{section.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {section.accounts.length} accounts
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {section.accounts.map((account, index) => {
                                                const isSelectable =
                                                    !account.isShared &&
                                                    !!account.id;
                                                const isSelected =
                                                    isSelectable &&
                                                    selectedAccountIds.has(
                                                        account.id
                                                    );
                                                const rowKey = account.id
                                                    ? account.id
                                                    : `${section.id}-${index}`;
                                                const isContextMenuOpen =
                                                    isSelectable &&
                                                    account.id ===
                                                        contextMenuAccountId;
                                                const rowClassName = [
                                                    "group hover:bg-accent/5",
                                                    "select-none",
                                                    isSelectable
                                                        ? "cursor-pointer"
                                                        : "",
                                                    isSelected
                                                        ? "bg-gradient-to-r from-accent/45 via-accent/25 to-transparent"
                                                        : "",
                                                ]
                                                    .filter(Boolean)
                                                    .join(" ");

                                                return (
                                                    <DropdownMenu
                                                        key={rowKey}
                                                        open={isContextMenuOpen}
                                                        onOpenChange={(open) => {
                                                            if (
                                                                !open &&
                                                                isContextMenuOpen
                                                            ) {
                                                                setContextMenuAccountId(
                                                                    null
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <DropdownMenuTrigger asChild>
                                                            <TableRow
                                                                className={
                                                                    rowClassName
                                                                }
                                                                aria-selected={
                                                                    isSelected
                                                                }
                                                                data-state={
                                                                    isSelected
                                                                        ? "selected"
                                                                        : undefined
                                                                }
                                                                onMouseDown={
                                                                    isSelectable
                                                                        ? handleRowMouseDown
                                                                        : undefined
                                                                }
                                                                onContextMenuCapture={
                                                                    isSelectable
                                                                        ? (
                                                                              event
                                                                          ) =>
                                                                              handleRowContextMenu(
                                                                                  event,
                                                                                  account,
                                                                                  orderedSelectableIds
                                                                              )
                                                                        : undefined
                                                                }
                                                                onClick={
                                                                    isSelectable
                                                                        ? (
                                                                              event
                                                                          ) =>
                                                                              handleRowClick(
                                                                                  event,
                                                                                  account,
                                                                                  orderedSelectableIds
                                                                              )
                                                                        : undefined
                                                                }
                                                            >
                                                                <TableCell>
                                                                    <img
                                                                        className="w-10 h-10 rounded-lg"
                                                                        src={
                                                                            account.game ===
                                                                            "Marvel Rivals"
                                                                                ? "./images/marvel-rivals.png"
                                                                                : ""
                                                                        }
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="font-medium">
                                                                    <TextLabel
                                                                        content={
                                                                            account.username
                                                                        }
                                                                        showCopyButton
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextLabel
                                                                        content={
                                                                            account.password
                                                                        }
                                                                        showCopyButton
                                                                        showEyeButton
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Stack
                                                                        direction="row"
                                                                        align="center"
                                                                        spacing="small"
                                                                    >
                                                                        {account.isLoadingRank ? (
                                                                            <CircularProgress />
                                                                        ) : (
                                                                            account.rank && (
                                                                                <img
                                                                                    className="w-[30px] h-[30px] object-cover rounded-md"
                                                                                    src={getImageFromRank(
                                                                                        account.rank
                                                                                    )}
                                                                                    alt={account.rank}
                                                                                />
                                                                            )
                                                                        )}
                                                                        {!account.isLoadingRank &&
                                                                            (account.rank ? (
                                                                                <span>
                                                                                    {account.rank}
                                                                                </span>
                                                                            ) : (
                                                                                <Lock color="gray" />
                                                                            ))}
                                                                    </Stack>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <ExpandableNotes
                                                                        content={
                                                                            account.notes ??
                                                                            ""
                                                                        }
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() =>
                                                                                handleEdit(
                                                                                    account
                                                                                )
                                                                            }
                                                                            className="h-8 w-8"
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                            <span className="sr-only">
                                                                                Edit
                                                                            </span>
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() =>
                                                                                handleDelete(
                                                                                    account
                                                                                )
                                                                            }
                                                                            className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                            <span className="sr-only">
                                                                                Delete
                                                                            </span>
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        </DropdownMenuTrigger>
                                                        {isSelectable ? (
                                                            <DropdownMenuContent
                                                                align="start"
                                                                className="w-56"
                                                            >
                                                                <DropdownMenuLabel>
                                                                    {selectedCount} selected
                                                                </DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuSub>
                                                                    <DropdownMenuSubTrigger>
                                                                        Move to group
                                                                    </DropdownMenuSubTrigger>
                                                                    <DropdownMenuSubContent>
                                                                        {groups.length >
                                                                        0 ? (
                                                                            groups.map(
                                                                                (
                                                                                    group
                                                                                ) => (
                                                                                    <DropdownMenuItem
                                                                                        key={
                                                                                            group.id
                                                                                        }
                                                                                        onSelect={() =>
                                                                                            handleBulkMove(
                                                                                                group.id
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            group.name
                                                                                        }
                                                                                    </DropdownMenuItem>
                                                                                )
                                                                            )
                                                                        ) : (
                                                                            <DropdownMenuItem disabled>
                                                                                No groups available
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                    </DropdownMenuSubContent>
                                                                </DropdownMenuSub>
                                                                <DropdownMenuItem
                                                                    onSelect={
                                                                        handleBulkDelete
                                                                    }
                                                                    className="text-destructive focus:text-destructive"
                                                                >
                                                                    Delete selected
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    onSelect={
                                                                        clearSelection
                                                                    }
                                                                >
                                                                    Clear selection
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        ) : null}
                                                    </DropdownMenu>
                                                );
                                            })}
                                        </Fragment>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="p-4 flex justify-center border-t">
                        <Button
                            onClick={() => handleSetCreateOpen(true)}
                            className="px-8"
                            variant="secondary"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add account
                        </Button>
                    </div>
                </div>

                <AddAccountDialog
                    open={createOpen}
                    setOpen={handleSetCreateOpen}
                    handleSubmit={handleSubmit}
                    defaultValues={
                        editingAccount
                            ? {
                                  game: editingAccount.game ?? "None",
                                  username: editingAccount.username,
                                  password: editingAccount.password,
                                  notes: editingAccount.notes ?? "",
                                  groupId:
                                      editingAccount.groupId ??
                                      defaultGroupId ??
                                      undefined,
                              }
                            : undefined
                    }
                    groups={groups}
                    defaultGroupId={defaultGroupId}
                />

                <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle>New Group</DialogTitle>
                            <DialogDescription>
                                Create a group to control what you share.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                            <Label htmlFor="group-name">Group name</Label>
                            <Input
                                id="group-name"
                                value={newGroupName}
                                onChange={(event) =>
                                    setNewGroupName(event.target.value)
                                }
                                placeholder="e.g. Friends"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setNewGroupOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleCreateGroup}>
                                Create group
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Invite Link</DialogTitle>
                            <DialogDescription>
                                Share this invite link with the person you want
                                to give access to
                            </DialogDescription>
                        </DialogHeader>
                        {inviteCode ? (
                            <div className="w-full overflow-hidden">
                                <TextLabel
                                    content={
                                        inviteCode
                                            ? `${window.location.origin}/invite?code=${inviteCode}`
                                            : ""
                                    }
                                    showCopyButton
                                    className="break-all"
                                />
                            </div>
                        ) : (
                            <CircularProgress />
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog open={shareOpen} onOpenChange={setShareOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Share Accounts</DialogTitle>
                            <DialogDescription>
                                You are about to share the{" "}
                                <span className="font-semibold text-foreground">
                                    {shareGroupName}
                                </span>{" "}
                                group with{" "}
                                <span className="font-semibold text-foreground">
                                    {inviteeEmail ?? "the connected user"}
                                </span>
                                . Make sure this is the right person before
                                continuing.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                            <Label htmlFor="share-group">Group to share</Label>
                            <Select
                                value={
                                    shareGroupId ??
                                    defaultGroupId ??
                                    undefined
                                }
                                onValueChange={setShareGroupId}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a group" />
                                </SelectTrigger>
                                <SelectContent>
                                    {groups.map(group => (
                                        <SelectItem
                                            key={group.id}
                                            value={group.id}
                                        >
                                            {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Connected user:{" "}
                            {inviteeEmail ?? "Waiting for identity..."}
                        </div>
                        <div className="flex flex-row gap-4 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setShareOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="default"
                                onClick={handleAccountShare}
                                disabled={!shareGroupId && !defaultGroupId}
                            >
                                Yes, Share Group
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {showPasswordPrompt && (
                    <PasswordPrompt
                        onConfirm={() => setShowPasswordPrompt(false)}
                        onPasswordEntered={handlePasswordSubmit}
                    />
                )}
            </div>
        </div>
    );
}
