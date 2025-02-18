import * as signalR from '@microsoft/signalr';
import Cookies from 'js-cookie';
import { SignalData } from 'simple-peer';

interface SignalRCallbacks {
    roomCreated?: (roomId: string) => void;
    userJoined?: () => void;
    receiveSignal?: (signal: string | SignalData) => void;
}

export class SignalRService {
    public connection: signalR.HubConnection;
    public isConnected: boolean = false;
    public roomId: string = "";

    constructor(callbacks: SignalRCallbacks) {
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl("/api/hub", {
                accessTokenFactory: () => Cookies.get("token")!
            })
            .configureLogging(signalR.LogLevel.Debug)
            .withAutomaticReconnect()
            .build();

        if (callbacks.roomCreated)
            this.connection.on("RoomCreated", callbacks.roomCreated);

        if (callbacks.userJoined)
            this.connection.on("UserJoined", callbacks.userJoined);
        
        if (callbacks.receiveSignal)
            this.connection.on("ReceiveSignal", callbacks.receiveSignal);
    }

    public sendSignal(roomId: string, data: SignalData) {
        this.connection.invoke("SendSignal", roomId, data);
    }

    public createRoom() {
        this.connection.invoke("CreateRoom");
    }

    public async connect(): Promise<void> {
        try {
            await this.connection.start();
            this.isConnected = true;
        } catch (error) {
            this.isConnected = false;
            throw error;
        }
    }

    public getConnectionStatus(): boolean {
        return this.isConnected;
    }

    get invoke() {
        return this.connection.invoke;
    }

    public async disconnect(): Promise<void> {
        if (this.connection.state === signalR.HubConnectionState.Connected) {
            await this.connection.stop();
            this.isConnected = false;
        }
    }
}