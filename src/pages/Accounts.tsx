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
import {
    Plus,
    Pencil,
    Trash2,
    RefreshCcw,
    Settings,
    Share,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAccountContext } from "@/stores/AccountProvider";
import { decryptMasterKey, encryptAccountData } from "@/utils/encryption";
import { accountApi } from "@/services/AccountApi";
import { useToast } from "@/hooks/use-toast";
import { PasswordPrompt } from "@/components/PasswordPrompt";
import type { Account } from "@/stores/AccountProvider";
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
import { arrayBufferToBase64, base64ToArrayBuffer } from "@/utils/crypto";

export function Accounts() {
    const {
        isAuthenticated,
        loadAccounts,
        decryptedAccounts,
        currentPassword,
        masterKeyParams,
        logout,
        loadSharedAccounts,
    } = useAccountContext();
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

    useEffect(() => {
        const initializeAccounts = async () => {
            try {
                if (currentPassword) {
                    await loadAccounts(currentPassword);
                    await loadSharedAccounts(currentPassword);
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
            await loadAccounts(currentPassword);
            await loadSharedAccounts(currentPassword);
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
        };

        try {
            if (!currentPassword || !masterKeyParams) {
                setShowPasswordPrompt(true);
                return;
            }

            if (editingAccount) {
                await handleEditSubmit(accountData);
            } else {
                await handleAdd(accountData);
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

    const handleAdd = async (accountData: {
        username: string;
        password: string;
        notes: string;
    }) => {
        if (!currentPassword || !masterKeyParams) {
            throw new Error("Missing credentials");
        }

        const { encryptedData, userKey } = await encryptAccountData(
            accountData,
            currentPassword,
            masterKeyParams
        );

        await accountApi.addAccount({
            encryptedData,
            userKey,
        });

        await loadAccounts(currentPassword);

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
        if (!currentPassword || !masterKeyParams || !editingAccount?.id) {
            throw new Error("Missing credentials or account ID");
        }

        const { encryptedData, userKey } = await encryptAccountData(
            accountData,
            currentPassword,
            masterKeyParams
        );

        await accountApi.editAccount(editingAccount.id, {
            encryptedData,
            userKey,
        });

        await loadAccounts(currentPassword);

        toast({
            title: "Success",
            description: "Account updated successfully.",
        });

        setEditingAccount(null);
        setCreateOpen(false);
    };

    const handlePasswordSubmit = async (enteredPassword: string) => {
        try {
            await loadAccounts(enteredPassword);
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
                    await handleAdd(accountData);
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
            await loadAccounts(currentPassword!);
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

        try {
            setIsConnecting(true);

            const service = new SignalRService({
                roomCreated: (roomId) => {
                    setInviteCode(roomId);
                    setIsConnecting(false);
                    service.roomId = roomId;
                    console.log("Room created:", roomId);
                },
                userJoined: () => {
                    if (peer) {
                        peer.initiate(true, service.roomId);
                    }
                },
                receiveSignal: (signal) => {
                    console.log("Received signal:", signal);
                    if (peer) {
                        peer.signal(signal);
                    }
                },
            });

            const peer = new PeerService(service);

            peer.registerHandler('verification', async (payload) => {
                if (!masterKeyParams || !currentPassword) {
                    throw new Error("Missing master key parameters or password");
                }

                const decryptedMasterKey = await decryptMasterKey(
                    masterKeyParams.masterKeyEncrypted,
                    masterKeyParams.masterKeyIv,
                    masterKeyParams.salt,
                    masterKeyParams.tag,
                    currentPassword
                );

                const rawKeyBuffer = await crypto.subtle.exportKey(
                    "raw",
                    decryptedMasterKey
                );

                const hmacKey = await crypto.subtle.importKey(
                    'raw',
                    rawKeyBuffer,
                    { name: 'HMAC', hash: 'SHA-256' },
                    false,
                    ['sign']
                );

                const theirSignature = base64ToArrayBuffer(payload.signature);
                const mySignature = await crypto.subtle.sign(
                    'HMAC',
                    hmacKey,
                    base64ToArrayBuffer(payload.token)
                );

                // Verify signatures match
                const verified = new Uint8Array(theirSignature).every(
                    (value, index) => value === new Uint8Array(mySignature)[index]
                );
                
                if (verified) {
                    // Create sharing relationship
                    await accountApi.createSharingRelationship({
                        sharedWithEmail: payload.encryptedKey.email,
                        encryptedMasterKey: payload.encryptedKey.encryptedMasterKey,
                        iv: payload.encryptedKey.iv,
                        salt: payload.encryptedKey.salt,
                        tag: payload.encryptedKey.tag
                    });

                    peer.sendMessage("sharingConfirmation", {
                        success: true
                    })
                    
                    toast({
                        title: "Success",
                        description: "Account sharing verified successfully.",
                    });
                    setShareOpen(false);
                } else {
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Failed to verify account sharing.",
                    });
                }
            });

            peer.onConnect = () => {
                console.log("share open")
                setShareOpen(true);
            };

            await service.connect();
            service.createRoom();

            setSignalRService(service);
            setPeer(peer);
        } catch (error) {
            console.error("Failed to establish connection:", error);
            toast({
                variant: "destructive",
                title: "Connection Failed",
                description:
                    "Failed to establish connection. Please try again.",
            });
        }
    };

    const handleAccountShare = async () => {
        if (!masterKeyParams) {
            throw Error("failed to find master key data.");
        } else if (!currentPassword) {
            throw Error("user is not authed");
        }

        const decryptedMasterKey = await decryptMasterKey(
            masterKeyParams.masterKeyEncrypted,
            masterKeyParams.masterKeyIv,
            masterKeyParams.salt,
            masterKeyParams.tag,
            currentPassword
        );

        const rawKeyBuffer = await crypto.subtle.exportKey(
            "raw",
            decryptedMasterKey
        );

        peer!.sendMessage('masterKey', {
            key: arrayBufferToBase64(rawKeyBuffer)
        });

        setShareOpen(false);
    };

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-semibold">Accounts</h1>
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
                                    <TableHead className="w-[200px]">
                                        Username
                                    </TableHead>
                                    <TableHead className="w-[200px]">
                                        Password
                                    </TableHead>
                                    {/* <TableHead className="w-[120px]">
                                        Rank
                                    </TableHead> */}
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
                                                    Add your first account to
                                                    get started
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
                                            {/* <TableCell>
                                                <TextLabel
                                                    content={
                                                        account.rank ||
                                                        "Unknown"
                                                    }
                                                    showCopyButton
                                                />
                                            </TableCell> */}
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

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>
                                {editingAccount
                                    ? "Edit account"
                                    : "Add account"}
                            </DialogTitle>
                            <DialogDescription>
                                {editingAccount
                                    ? "Update your account credentials."
                                    : "Add your account credentials to be securely stored."}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        name="username"
                                        required
                                        defaultValue={editingAccount?.username}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        defaultValue={editingAccount?.password}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        name="notes"
                                        defaultValue={editingAccount?.notes}
                                        className="min-h-[100px] resize-none"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    variant="secondary"
                                >
                                    {editingAccount
                                        ? "Update account"
                                        : "Add account"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite Link</DialogTitle>
                            <DialogDescription>
                                Share this invite link with the person you want
                                to give access to
                            </DialogDescription>
                        </DialogHeader>
                        {inviteCode ? (
                            <div className="max-w-full break-all">
                                <TextLabel
                                    content={
                                        inviteCode
                                            ? `${window.location.origin}/invite?code=${inviteCode}`
                                            : ""
                                    }
                                    showCopyButton
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
                                Clicking "Yes" will give the connected user
                                access to all your accounts.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-row gap-4 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setInviteOpen(false)}
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
