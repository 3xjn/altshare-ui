import Peer, { SignalData, SimplePeerData } from 'simple-peer';
import { SignalRService } from './SignalR';

interface MasterKeyPayload {
    key: string;
}

interface VerificationPayload {
    token: string;
    signature: string;
    encryptedKey: {
        email: string;
        encryptedMasterKey: string;
        iv: string;
        salt: string;
        tag: string;
    };
}

interface UserInfoPayload {
    email: string;
}

interface SharingConfirmationPayload {
    success: boolean
}

type MessagePayloads = {
    'masterKey': MasterKeyPayload;
    'verification': VerificationPayload;
    'userInfo': UserInfoPayload;
    'sharingConfirmation': SharingConfirmationPayload
}

type MessageHandler<T extends keyof MessagePayloads> = 
    (payload: MessagePayloads[T]) => void | Promise<void>;

interface PeerMessage<T extends keyof MessagePayloads> {
    action: T;
    payload: MessagePayloads[T];
}

export class PeerService {
    private peer: Peer.Instance | null = null;
    private signalR: SignalRService;
    private roomId: string = "";
    private messageHandlers = new Map<
        keyof MessagePayloads, 
        MessageHandler<keyof MessagePayloads>
    >();
    public onConnect?: () => void;

    constructor(signalR: SignalRService) {
        this.signalR = signalR;
    }

    public initiate(isInitiator: boolean, roomId: string) {
        this.roomId = roomId;
        
        this.peer = new Peer({
            initiator: isInitiator,
            trickle: true,
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });

        this.peer.on('signal', (data) => {
            console.log('sending signal:', data);
            this.signalR.sendSignal(this.roomId, data);
        });

        this.peer.on('connect', () => {
            console.log('Peer connection established');
            if (this.onConnect) this.onConnect();
        });

        this.peer.on('data', (data) => {
            const parsed = JSON.parse(data.toString());
            console.log(`Received data action: ${parsed.action}`);
            console.log('Full message payload:', parsed.payload);
            this.handleMessage(data.toString());
        });
    }

    public signal(data: string | SignalData) {
        this.peer?.signal(data);
    }

    public send(data: SimplePeerData) {
        this.peer?.send(data);
    }

    // Type-safe handler registration
    public registerHandler<T extends keyof MessagePayloads>(
        action: T, 
        handler: MessageHandler<T>
    ) {
        this.messageHandlers.set(action, handler as MessageHandler<keyof MessagePayloads>);
    }

    // Type-safe message sending
    public sendMessage<T extends keyof MessagePayloads>(
        action: T, 
        payload: MessagePayloads[T]
    ) {
        this.send(JSON.stringify({ action, payload }));
    }

    private async handleMessage(data: string) {
        try {
            const message = JSON.parse(data) as PeerMessage<keyof MessagePayloads>;
            const handler = this.messageHandlers.get(message.action);
            
            if (handler) {
                await handler(message.payload);
            } else {
                console.warn(`No handler registered for action: ${message.action}`);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }
}