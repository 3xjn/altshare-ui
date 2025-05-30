declare module 'argon2-browser' {
    export enum ArgonType {
        Argon2d = 0,
        Argon2i = 1,
        Argon2id = 2
    }

    export interface HashOptions {
        pass: string;
        salt: Uint8Array;
        time?: number;
        mem?: number;
        parallelism?: number;
        type?: ArgonType;
        hashLen?: number;
    }

    export interface HashResult {
        hash: Uint8Array;
        hashHex: string;
        encoded: string;
    }

    export function hash(options: HashOptions): Promise<HashResult>;
} 