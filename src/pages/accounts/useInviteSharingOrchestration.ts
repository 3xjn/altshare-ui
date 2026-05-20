import { useCallback, useEffect, useRef, useState } from "react";
import type { Toast } from "@/hooks/use-toast";
import { accountApi, type SharingRelationship } from "@/services/AccountApi";
import { PeerService } from "@/services/PeerService";
import { SignalRService } from "@/services/SignalR";
import { base64ToArrayBuffer } from "@/utils/crypto";

type ResolveGroupKey = (
    groupId?: string | null
) => Promise<{ groupId: string; groupKey: string }>;

type UseInviteSharingOrchestrationArgs = {
    isTestMode: boolean;
    activeGroupId: string;
    defaultGroupId: string | null;
    resolveGroupKey: ResolveGroupKey;
    toast: (args: Toast) => void;
};

export function useInviteSharingOrchestration({
    isTestMode,
    activeGroupId,
    defaultGroupId,
    resolveGroupKey,
    toast,
}: UseInviteSharingOrchestrationArgs) {
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

    const inviteSessionRef = useRef(0);

    const invalidateInviteSession = () => {
        inviteSessionRef.current += 1;
        return inviteSessionRef.current;
    };

    const clearInviteSession = useCallback(async () => {
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
    }, [signalRService]);

    useEffect(() => {
        return () => {
            void signalRService?.disconnect();
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

    const loadSharingRelationships = useCallback(async () => {
        try {
            setIsSharingLoading(true);
            const response = await accountApi.getSharingRelationships();
            setSharingRelationships(response);
        } catch (error) {
            console.error("Failed to load sharing relationships:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load shared access. Please try again.",
            });
        } finally {
            setIsSharingLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!sharingModalOpen) return;
        void loadSharingRelationships();
    }, [loadSharingRelationships, sharingModalOpen]);

    const handleRevokeShare = async () => {
        if (!revokeTarget) return;

        try {
            setIsRevokingShare(true);
            await accountApi.revokeSharingRelationship(revokeTarget.id);
            setSharingRelationships((prev) =>
                prev.filter((relationship) => relationship.id !== revokeTarget.id)
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
                setInviteeEmail((payload as { email: string }).email);
            });

            newPeer.registerHandler(
                "verification",
                async (rawPayload: unknown) => {
                    try {
                        if (isStale()) return;

                        const payload = rawPayload as {
                            token: string;
                            signature: string;
                            encryptedKey: {
                                email: string;
                                groupId: string;
                                encryptedGroupKey: string;
                                iv: string;
                                salt: string;
                                tag: string;
                            };
                        };

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
                        const theirSignature = base64ToArrayBuffer(payload.signature);
                        const mySignature = await crypto.subtle.sign(
                            "HMAC",
                            hmacKey,
                            base64ToArrayBuffer(payload.token)
                        );

                        const verified = new Uint8Array(theirSignature).every(
                            (value, index) => value === new Uint8Array(mySignature)[index]
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
                }
            );

            newPeer.onConnect = () => {
                if (isStale()) return;
                setShareOpen(true);
            };

            await service.connect();
            if (isStale()) {
                try {
                    await service.disconnect();
                } catch (error) {
                    console.warn("Failed to disconnect stale invite session:", error);
                }
                return;
            }
            service.createRoom();
            if (isStale()) {
                try {
                    await service.disconnect();
                } catch (error) {
                    console.warn("Failed to disconnect stale invite session:", error);
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
                description: "Failed to establish connection. Please try again.",
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

    return {
        isConnecting,
        shareOpen,
        inviteModalOpen,
        sharingModalOpen,
        sharingRelationships,
        isSharingLoading,
        revokeTarget,
        isRevokingShare,
        shareGroupId,
        inviteeEmail,
        inviteCode,
        setInviteModalOpen,
        setSharingModalOpen,
        setRevokeTarget,
        setShareGroupId,
        openSharingModal: () => setSharingModalOpen(true),
        loadSharingRelationships,
        handleRevokeShare,
        handleInviteClick,
        startInviteSession,
        clearInviteSession,
        handleAccountShare,
    };
}
