import { CircularProgress } from "@/components/ui/progress";
import { SignalRService } from "@/services/SignalR";
import { PeerService } from "@/services/PeerService";
import { useAccountContext } from "@/stores/AccountProvider";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { arrayBufferToBase64, base64ToArrayBuffer, encryptExistingMasterKey } from "@/utils/crypto";

export const Invite: React.FC = () => {
    const { isAuthenticated, currentPassword, getCurrentUserEmail } = useAccountContext();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const [isConnecting, setIsConnecting] = useState(true);
    const [signalRService, setSignalRService] = useState<SignalRService | null>(null);
    const [message, setMessage] = useState("Connected to server! Waiting for sharer...");

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

                const peer = new PeerService(service);

                peer.onConnect = () => setMessage("Waiting for user to accept.");

                peer.registerHandler('masterKey', async (payload) => {
                    setMessage("User accepted!")

                    const encryptedKey = await encryptExistingMasterKey(payload.key, currentPassword!);
                    
                    const shareToken = crypto.getRandomValues(new Uint8Array(16));
                    const keyData = base64ToArrayBuffer(payload.key);
                    const email = getCurrentUserEmail();
                    
                    if (!email) {
                        throw new Error("User email not found in token");
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
                            ...encryptedKey
                        }
                    });
                });

                peer.registerHandler("sharingConfirmation", (payload) => {
                    if (payload.success) {
                        navigate("/", { replace: true })
                    }
                });

                // peer.registerHandler('userInfo', (payload) => {
                //     setHostInfo(payload);
                // });

                peer.initiate(false, code);

                await service.connect();
                await service.connection.invoke("JoinRoom", code);

                setSignalRService(service);
                setIsConnecting(false);
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

        connect();

        return () => {
            if (signalRService) {
                signalRService.disconnect();
            }
        };
    }, [isAuthenticated, searchParams]);

    return (
        <div className="h-screen flex flex-col items-center justify-center">
            {isConnecting ? (
                <>
                    <CircularProgress />
                    <p className="mt-4 text-muted-foreground">
                        Connecting to server...
                    </p>
                </>
            ) : (
                <p className="text-muted-foreground">
                    {message}
                </p>
            )}
        </div>
    );
};
