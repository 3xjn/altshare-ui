import "../services/SignalR";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Account, useAccountStore } from "@/stores/AccountStore";
import { decryptMasterKey, encryptAccountData } from "@/utils/encryption";
import { accountApi, SharingRelationship } from "@/services/AccountApi";
import { useToast } from "@/hooks/use-toast";
import { PasswordPrompt } from "@/components/PasswordPrompt";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SignalRService } from "@/services/SignalR";
import { PeerService } from "@/services/PeerService";
import AddAccountDialog from "@/components/AddAccountDialog";
import { base64ToArrayBuffer } from "@/utils/crypto";
import type { AccountSection } from "@/components/accounts/types";
import { AccountsHeader } from "@/components/accounts/AccountsHeader";
import { AccountsToolbar } from "@/components/accounts/AccountsToolbar";
import { AccountsTable } from "@/components/accounts/AccountsTable";
import { NewGroupModal } from "@/components/accounts/NewGroupModal";
import { InviteModal } from "@/components/accounts/InviteModal";
import { SharingModal } from "@/components/accounts/SharingModal";
import { useAccountSelection } from "@/components/accounts/useAccountSelection";

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
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [sharingModalOpen, setSharingModalOpen] = useState(false);
    const [sharingRelationships, setSharingRelationships] = useState<
        SharingRelationship[]
    >([]);
    const [isSharingLoading, setIsSharingLoading] = useState(false);
    const [revokeTarget, setRevokeTarget] =
        useState<SharingRelationship | null>(null);
    const [isRevokingShare, setIsRevokingShare] = useState(false);
    const [shareGroupId, setShareGroupId] = useState<string | null>(null);
    const [inviteeEmail, setInviteeEmail] = useState<string | null>(null);
    const [activeGroupId, setActiveGroupId] = useState<string>("all");
    const [newGroupOpen, setNewGroupOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [expandedAccountKeys, setExpandedAccountKeys] = useState<
        Set<string>
    >(new Set());
    const [searchParams] = useSearchParams();
    const isTestMode = searchParams.get("test") === "true";

    const groupLookup = useMemo(() => {
        return new Map(groups.map(group => [group.id, group.name]));
    }, [groups]);

    const inviteSessionRef = useRef(0);

    useEffect(() => {
        const initializeAccounts = async () => {
            try {
                if (currentPassword) {
                    await loadGroups();
                    await loadAccounts();
                    await loadSharedAccounts();
                    void getRanks();
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
            signalRService?.disconnect();
        };
    }, [signalRService]);

    useEffect(() => {
        if (!shareOpen) return;

        const initialGroupId =
            activeGroupId !== "all" && activeGroupId !== "shared"
                ? activeGroupId
                : defaultGroupId;

        setShareGroupId(initialGroupId ?? null);
    }, [shareOpen, activeGroupId, defaultGroupId]);

    useEffect(() => {
        if (!sharingModalOpen) return;
        loadSharingRelationships();
    }, [sharingModalOpen]);



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
            void getRanks();

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
                    gameData: account.gameData ?? {},
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
        const gameValue = (formData.get("game") as string) || "None";
        const normalizedGame =
            gameValue && gameValue !== "None" ? gameValue : undefined;
        const gameDataEntries = Array.from(formData.entries()).filter(
            ([key, value]) => key.startsWith("gameField__") && value
        );
        const gameData = gameDataEntries.reduce<Record<string, string>>(
            (acc, [key, value]) => {
                const fieldKey = key.replace("gameField__", "");
                acc[fieldKey] = String(value);
                return acc;
            },
            {}
        );
        const accountData = {
            username: formData.get("username") as string,
            password: formData.get("password") as string,
            notes: (formData.get("notes") as string) || "",
            game: normalizedGame,
            gameData: Object.keys(gameData).length > 0 ? gameData : undefined,
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
        gameData?: Record<string, string>;
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
        void getRanks();

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
        gameData?: Record<string, string>;
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
        void getRanks();

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
                const gameValue = (formData.get("game") as string) || "None";
                const normalizedGame =
                    gameValue && gameValue !== "None" ? gameValue : undefined;
                const gameDataEntries = Array.from(formData.entries()).filter(
                    ([key, value]) => key.startsWith("gameField__") && value
                );
                const gameData = gameDataEntries.reduce<Record<string, string>>(
                    (acc, [key, value]) => {
                        const fieldKey = key.replace("gameField__", "");
                        acc[fieldKey] = String(value);
                        return acc;
                    },
                    {}
                );
                const accountData = {
                    username: formData.get("username") as string,
                    password: formData.get("password") as string,
                    notes: (formData.get("notes") as string) || "",
                    game: normalizedGame,
                    gameData:
                        Object.keys(gameData).length > 0
                            ? gameData
                            : undefined,
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

    const toggleAccountDetails = (detailKey: string) => {
        setExpandedAccountKeys((prev) => {
            const next = new Set(prev);
            if (next.has(detailKey)) {
                next.delete(detailKey);
            } else {
                next.add(detailKey);
            }
            return next;
        });
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

    const openSharingModal = () => {
        setSharingModalOpen(true);
    };

    const invalidateInviteSession = () => {
        inviteSessionRef.current += 1;
        return inviteSessionRef.current;
    };

    const clearInviteSession = async () => {
        invalidateInviteSession();
        try {
            await signalRService?.disconnect();
        } catch (error) {
            console.warn("Failed to disconnect invite session:", error);
        } finally {
            setSignalRService(null);
            setPeer(null);
            setIsConnecting(false);
            setInviteCode(null);
            setInviteeEmail(null);
            setShareOpen(false);
        }
    };

    const loadSharingRelationships = async () => {
        try {
            setIsSharingLoading(true);
            const response = await accountApi.getSharingRelationships();
            setSharingRelationships(response);
        } catch (error) {
            console.error("Failed to load sharing relationships:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description:
                    "Failed to load shared access. Please try again.",
            });
        } finally {
            setIsSharingLoading(false);
        }
    };

    const handleRevokeShare = async () => {
        if (!revokeTarget) return;

        try {
            setIsRevokingShare(true);
            await accountApi.revokeSharingRelationship(revokeTarget.id);
            setSharingRelationships((prev) =>
                prev.filter(
                    (relationship) => relationship.id !== revokeTarget.id
                )
            );
            toast({
                title: "Access revoked",
                description: `Removed access for ${revokeTarget.sharedWithEmail}.`,
            });
            setRevokeTarget(null);
        } catch (error) {
            console.error("Failed to revoke sharing relationship:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to revoke access. Please try again.",
            });
        } finally {
            setIsRevokingShare(false);
        }
    };

    const startInviteSession = async () => {
        if (isConnecting) return;
        await clearInviteSession();
        const sessionId = inviteSessionRef.current;
        const isStale = () => inviteSessionRef.current !== sessionId;

        if (isTestMode) {
            setIsConnecting(true);
            setTimeout(() => {
                if (isStale()) return;
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
                    if (isStale()) return;
                    setInviteCode(roomId);
                    setIsConnecting(false);
                    service.roomId = roomId;
                },
                userJoined: () => {
                    if (isStale()) return;
                    if (newPeer) {
                        newPeer.initiate(true, service.roomId);
                    }
                },
                receiveSignal: (signal) => {
                    if (isStale()) return;
                    if (newPeer) {
                        newPeer.signal(signal);
                    }
                },
            });

            newPeer = new PeerService(service);
            newPeer.registerHandler("userInfo", (payload) => {
                if (isStale()) return;
                setInviteeEmail(payload.email);
            });

            newPeer.registerHandler("verification", async (payload) => {
                try {
                    if (isStale()) return;
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

                    if (isStale()) return;
                    await loadSharingRelationships();
                    newPeer?.sendMessage("sharingConfirmation", {
                        success: true,
                    });
                    toast({
                        title: "Success",
                        description: "Account sharing verified successfully.",
                    });
                    await clearInviteSession();
                    setInviteModalOpen(false);
                } catch (error) {
                    if (isStale()) return;
                    console.error("Share verification failed:", error);
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Failed to verify account sharing.",
                    });
                }
            });

            newPeer.onConnect = () => {
                if (isStale()) return;
                setShareOpen(true);
            };

            await service.connect();
            if (isStale()) {
                try {
                    await service.disconnect();
                } catch (error) {
                    console.warn(
                        "Failed to disconnect stale invite session:",
                        error
                    );
                }
                return;
            }
            service.createRoom();
            if (isStale()) {
                try {
                    await service.disconnect();
                } catch (error) {
                    console.warn(
                        "Failed to disconnect stale invite session:",
                        error
                    );
                }
                return;
            }
            setSignalRService(service);
            setPeer(newPeer);
        } catch (error) {
            if (isStale()) return;
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

    const handleInviteClick = async () => {
        if (sharingModalOpen) {
            setSharingModalOpen(false);
            setRevokeTarget(null);
        }
        setInviteModalOpen(true);
        if (!inviteCode && !isConnecting) {
            await startInviteSession();
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

    const totalAccounts = groupedSections.reduce(
        (sum, section) => sum + section.accounts.length,
        0
    );

    const {
        selectedAccountIds,
        selectedCount,
        contextMenuAccountId,
        contextMenuPositionRef,
        handleRowMouseDown,
        handleRowClick,
        handleRowContextMenu,
        handleContextMenuOpenChange,
        clearSelection,
        handleBulkMove,
        handleBulkDelete,
    } = useAccountSelection({
        accounts: decryptedAccounts,
        sections: groupedSections,
        defaultGroupId,
        resolveGroupKey,
        loadAccounts,
        getRanks,
        toast,
    });

    if (!isAuthenticated && !isTestMode) {
        return <Navigate to="/login" replace />;
    }
    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <AccountsHeader
                    isConnecting={isConnecting}
                    onRefresh={() => void handleRefresh()}
                    onInvite={() => void handleInviteClick()}
                    onOpenSharing={openSharingModal}
                    onExportData={handleExportData}
                    onLogout={logout}
                />

                <div className="rounded-lg border bg-white">
                    <AccountsToolbar
                        activeGroupId={activeGroupId}
                        groups={groups}
                        selectedCount={selectedCount}
                        onGroupChange={setActiveGroupId}
                        onCreateGroup={() => setNewGroupOpen(true)}
                        onBulkMove={handleBulkMove}
                        onBulkDelete={handleBulkDelete}
                        onClearSelection={clearSelection}
                    />
                    <AccountsTable
                        isLoading={isLoading}
                        sections={groupedSections}
                        totalAccounts={totalAccounts}
                        groups={groups}
                        selectedAccountIds={selectedAccountIds}
                        expandedAccountKeys={expandedAccountKeys}
                        contextMenuAccountId={contextMenuAccountId}
                        contextMenuPositionRef={contextMenuPositionRef}
                        selectedCount={selectedCount}
                        onRowMouseDown={handleRowMouseDown}
                        onRowClick={handleRowClick}
                        onRowContextMenu={handleRowContextMenu}
                        onContextMenuOpenChange={handleContextMenuOpenChange}
                        onToggleDetails={toggleAccountDetails}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onBulkMove={handleBulkMove}
                        onBulkDelete={handleBulkDelete}
                        onClearSelection={clearSelection}
                    />
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
                                  gameData: editingAccount.gameData ?? {},
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

                <NewGroupModal
                    open={newGroupOpen}
                    name={newGroupName}
                    onNameChange={setNewGroupName}
                    onOpenChange={setNewGroupOpen}
                    onSubmit={handleCreateGroup}
                />

                <InviteModal
                    open={inviteModalOpen}
                    onOpenChange={(open) => {
                        setInviteModalOpen(open);
                        if (!open) {
                            void clearInviteSession();
                        }
                    }}
                    onClose={() => {
                        setInviteModalOpen(false);
                    }}
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
