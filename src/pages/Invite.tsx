import {
    Badge,
    Box,
    Button,
    Group,
    Loader,
    Paper,
    Stack,
    Text,
    Title,
} from "@mantine/core";
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
            navigate("/accounts");
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
                        navigate("/accounts", { replace: true })
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
    }, [
        currentEmail,
        currentPassword,
        isAuthenticated,
        navigate,
        searchParams,
        setCurrentEmail,
        toast,
    ]);

    const currentStage = stageCopy[stage];
    const isBusy = stage !== "complete" && stage !== "error";
    const stageBadge =
        stage === "error"
            ? { label: "Failed", color: "red" }
            : stage === "complete"
              ? { label: "Ready", color: "green" }
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
            <Paper withBorder radius="xl" shadow="sm" p="xl" className="w-full max-w-lg">
                <Stack gap="lg">
                    <Group align="flex-start" justify="space-between" gap="md" wrap="nowrap">
                        <Box>
                            <Title order={2} size="h3">
                                Accept invite
                            </Title>
                            <Text c="dimmed" size="sm" mt={4}>
                                Securely connect to the sharing session.
                            </Text>
                        </Box>
                        <Box className="flex min-w-[92px] justify-end">
                            {isBusy ? (
                                <Loader size="sm" type="oval" aria-label="Invite connection in progress" />
                            ) : stageBadge ? (
                                <Badge variant="light" color={stageBadge.color}>
                                    {stageBadge.label}
                                </Badge>
                            ) : null}
                        </Box>
                    </Group>
                    <Paper withBorder radius="md" p="md" className="bg-muted/30">
                        <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                            Status
                        </Text>
                        <Text mt="xs" size="sm" fw={600}>
                            {currentStage.title}
                        </Text>
                        <Text mt={4} size="sm" c="dimmed">
                            {currentStage.description}
                        </Text>
                    </Paper>
                    {stageHint ? (
                        <Text size="xs" c="dimmed">
                            {stageHint}
                        </Text>
                    ) : null}
                    <Group justify="flex-end">
                        <Button
                        variant="default"
                        onClick={() => navigate("/accounts")}
                        disabled={isBusy}
                    >
                        Back to accounts
                    </Button>
                    </Group>
                </Stack>
            </Paper>
        </div>
    );
};
