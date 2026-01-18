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
import { useEffect, useState } from "react";
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
        decryptedAccounts,
        loadAccounts,
        loadSharedAccounts,
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
    const [inviteeEmail, setInviteeEmail] = useState<string | null>(null);
    const [searchParams] = useSearchParams();
    const isTestMode = searchParams.get("test") === "true";

    useEffect(() => {
        const initializeAccounts = async () => {
            try {
                if (currentPassword) {
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

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const accountData = {
            username: formData.get("username") as string,
            password: formData.get("password") as string,
            notes: (formData.get("notes") as string) || "",
            game: (formData.get("game") as string) || "",
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
    }) => {
        if (!currentPassword || !encryptedMasterKey) {
            throw new Error("Missing credentials");
        }
        const decryptedMasterKey = await decryptMasterKey(
            encryptedMasterKey,
            currentPassword
        );
        if (!decryptedMasterKey.isUtf8Valid || !decryptedMasterKey.data) {
            throw new Error("Failed to decrypt master key");
        }

        const encryptedData = await encryptAccountData(
            JSON.stringify(accountData),
            decryptedMasterKey.data
        );

        await accountApi.addAccount({
            encryptedData,
        });

        await loadAccounts();
        getRanks();

        toast({
            title: "Success",
            description: "Account added successfully.",
        });

        setCreateOpen(false);
    };

    const handleEditSubmit = async (accountData: {
        username: string;
        password: string;
        notes: string;
    }) => {
        if (!currentPassword || !encryptedMasterKey || !editingAccount?.id) {
            throw new Error("Missing credentials or account ID");
        }

        const decryptedMasterKey = await decryptMasterKey(
            encryptedMasterKey,
            currentPassword
        );
        if (!decryptedMasterKey.isUtf8Valid || !decryptedMasterKey.data) {
            throw new Error("Failed to decrypt master key");
        }
        const encryptedData = await encryptAccountData(
            JSON.stringify(accountData),
            decryptedMasterKey.data
        );

        await accountApi.editAccount(editingAccount.id, {
            encryptedData,
        });

        await loadAccounts();
        getRanks();

        toast({
            title: "Success",
            description: "Account updated successfully.",
        });

        setEditingAccount(null);
        setCreateOpen(false);
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
        setCreateOpen(true);
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
                    if (!encryptedMasterKey || !currentPassword) {
                        throw new Error("Missing master key or password");
                    }

                    const decryptedMasterKey = await decryptMasterKey(
                        encryptedMasterKey,
                        currentPassword
                    );
                    if (
                        !decryptedMasterKey.isUtf8Valid ||
                        !decryptedMasterKey.data
                    ) {
                        throw new Error("Failed to decrypt master key");
                    }

                    const rawKeyBuffer = base64ToArrayBuffer(
                        decryptedMasterKey.data
                    );
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
                        encryptedMasterKey: payload.encryptedKey.encryptedMasterKey,
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

    const handleAccountShare = async () => {
        if (!peer) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No active sharing session found.",
            });
            return;
        }

        if (!encryptedMasterKey || !currentPassword) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Missing master key or password.",
            });
            return;
        }

        try {
            const decryptedMasterKey = await decryptMasterKey(
                encryptedMasterKey,
                currentPassword
            );
            if (!decryptedMasterKey.isUtf8Valid || !decryptedMasterKey.data) {
                throw new Error("Failed to decrypt master key");
            }

            peer.sendMessage("masterKey", {
                key: decryptedMasterKey.data,
            });
            setShareOpen(false);
        } catch (error) {
            console.error("Failed to share master key:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to share master key.",
            });
        }
    };

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
                    <div className="px-6">
                        <Table>
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
                                        <TableCell colSpan={5} className="h-32">
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
                                ) : decryptedAccounts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32">
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
                                    decryptedAccounts.map((account, index) => (
                                        <TableRow
                                            key={index}
                                            className="group hover:bg-accent/5"
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
                                                    content={account.username}
                                                    showCopyButton
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextLabel
                                                    content={account.password}
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
                                                                alt={
                                                                    account.rank
                                                                }
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
                                                        account.notes ?? ""
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleEdit(account)
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
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="p-4 flex justify-center border-t">
                        <Button
                            onClick={() => setCreateOpen(true)}
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
                    setOpen={setCreateOpen}
                    handleSubmit={handleSubmit}
                    // defaultValues={}
                />

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
                                You are about to share all your accounts with{" "}
                                <span className="font-semibold text-foreground">
                                    {inviteeEmail ?? "the connected user"}
                                </span>
                                . Make sure this is the right person before
                                continuing.
                            </DialogDescription>
                        </DialogHeader>
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
                            >
                                Yes, Share Accounts
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
