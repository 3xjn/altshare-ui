import { CircularProgress } from "@/components/ui/progress";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignalRService } from "@/services/SignalR";
import { PeerService } from "@/services/PeerService";
import { useAccountStore } from "@/stores/AccountStore";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { arrayBufferToBase64, base64ToArrayBuffer, encryptExistingMasterKey } from "@/utils/crypto";
import { authApi } from "@/services/AuthApi";

export const Invite: React.FC = () => {
    const { isAuthenticated, currentPassword, currentEmail, setCurrentEmail } = useAccountStore();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const [stage, setStage] = useState<"connecting" | "waiting" | "approving" | "exchanging" | "complete" | "error">("connecting");
    const signalRServiceRef = useRef<SignalRService | null>(null);

    const stageCopy = {
        connecting: {
            title: "Connecting",
            description: "Establishing a secure session.",
        },
        waiting: {
            title: "Waiting for the sharer",
            description: "They haven't joined yet.",
        },
        approving: {
            title: "Awaiting approval",
            description: "They're connected and reviewing access.",
        },
        exchanging: {
            title: "Securing access",
            description: "Encrypting and verifying your access.",
        },
        complete: {
            title: "Access granted",
            description: "Redirecting to your accounts.",
        },
        error: {
            title: "Connection failed",
            description: "Please try again or request a new invite.",
        },
    } as const;

    useEffect(() => {
        if (!isAuthenticated) {
            navigate(`/login?code=${searchParams.get("code")}`);
            return;
        }

        const code = searchParams.get("code");
        if (!code) {
            navigate("/");
            return;
        }

        const connect = async () => {
            try {
                const service = new SignalRService({
                    receiveSignal: (signal) => {
                        console.log("Received signal:", signal);
                        if (peer) {
                            peer.signal(signal);
                        }
                    },
                });
                signalRServiceRef.current = service;

                const peer = new PeerService(service);

                peer.onConnect = async () => {
                    setStage("approving");
                    try {
                        const email = await resolveEmail();
                        if (email) {
                            peer.sendMessage("userInfo", { email });
                        }
                    } catch (error) {
                        console.error("Failed to send user info:", error);
                    }
                };

                const resolveEmail = async (): Promise<string | null> => {
                    if (currentEmail) return currentEmail;
                    try {
                        const user = await authApi.getCurrentUser();
                        if (user.email) {
                            setCurrentEmail(user.email);
                            return user.email;
                        }
                    } catch (error) {
                        console.error("Failed to fetch current user:", error);
                    }
                    return null;
                };

                peer.registerHandler('groupKey', async (payload) => {
                    setStage("exchanging");

                    if (!currentPassword) {
                        setStage("error");
                        toast({
                            variant: "destructive",
                            title: "Missing password",
                            description: "Please log in again to complete the invite.",
                        });
                        return;
                    }

                    const encryptedGroupKey = await encryptExistingMasterKey(payload.key, currentPassword);
                    
                    const shareToken = crypto.getRandomValues(new Uint8Array(16));
                    const keyData = base64ToArrayBuffer(payload.key);
                    const email = await resolveEmail();
                    
                    if (!email) {
                        setStage("error");
                        toast({
                            variant: "destructive",
                            title: "Missing account email",
                            description: "Please log in again to continue.",
                        });
                        return;
                    }

                    const hmacKey = await window.crypto.subtle.importKey(
                        "raw",
                        keyData,
                        { name: "HMAC", hash: "SHA-256" },
                        false,
                        ["sign"]
                    );

                    const signature = await window.crypto.subtle.sign(
                        'HMAC',
                        hmacKey,
                        shareToken
                    );

                    peer.sendMessage('verification', {
                        token: arrayBufferToBase64(shareToken),
                        signature: arrayBufferToBase64(signature),
                        encryptedKey: {
                            email,
                            groupId: payload.groupId,
                            encryptedGroupKey: encryptedGroupKey.encryptedMasterKey,
                            iv: encryptedGroupKey.iv,
                            salt: encryptedGroupKey.salt,
                            tag: encryptedGroupKey.tag
                        }
                    });
                });

                peer.registerHandler("sharingConfirmation", (payload) => {
                    if (payload.success) {
                        setStage("complete");
                        navigate("/", { replace: true })
                    }
                });

                // peer.registerHandler('userInfo', (payload) => {
                //     setHostInfo(payload);
                // });

                peer.initiate(false, code);

                await service.connect();
                await service.connection.invoke("JoinRoom", code);

                setStage("waiting");
            } catch (error) {
                console.error("Failed to establish connection:", error);
                if (signalRServiceRef.current) {
                    signalRServiceRef.current.disconnect();
                    signalRServiceRef.current = null;
                }
                setStage("error");
                toast({
                    variant: "destructive",
                    title: "Connection Failed",
                    description:
                        "Failed to establish connection. Please try again.",
                });
            }
        };

        connect();

        return () => {
            if (signalRServiceRef.current) {
                signalRServiceRef.current.disconnect();
                signalRServiceRef.current = null;
            }
        };
    }, [isAuthenticated, navigate, searchParams, toast]);

    const currentStage = stageCopy[stage];
    const isBusy = stage !== "complete" && stage !== "error";
    const stageBadge =
        stage === "error"
            ? { label: "Failed", className: "bg-destructive/10 text-destructive" }
            : stage === "complete"
              ? { label: "Ready", className: "bg-emerald-500/10 text-emerald-600" }
              : null;
    const stageHint =
        stage === "waiting"
            ? "Keep this tab open so we can connect."
            : stage === "approving"
              ? "Keep this tab open until they approve."
            : stage === "exchanging"
              ? "This usually takes a few seconds."
              : stage === "connecting"
                ? "Hang tight while we establish the connection."
                : null;

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-10">
            <Card className="w-full max-w-lg">
                <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle>Accept invite</CardTitle>
                            <CardDescription>
                                Securely connect to the sharing session.
                            </CardDescription>
                        </div>
                        <div className="flex min-w-[92px] justify-end">
                            {isBusy ? (
                                <CircularProgress />
                            ) : stageBadge ? (
                                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${stageBadge.className}`}>
                                    {stageBadge.label}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Status
                        </div>
                        <div className="mt-2 text-sm font-semibold text-foreground">
                            {currentStage.title}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {currentStage.description}
                        </p>
                    </div>
                    {stageHint ? (
                        <p className="text-xs text-muted-foreground">
                            {stageHint}
                        </p>
                    ) : null}
                </CardContent>
                <CardFooter className="justify-end">
                    <Button
                        variant="outline"
                        onClick={() => navigate("/")}
                        disabled={isBusy}
                    >
                        Back to accounts
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};
