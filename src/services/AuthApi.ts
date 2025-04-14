import { isAxiosError } from 'axios';
import { ApiService } from './ApiService';
import { RegisterData, RegisterResponse } from '@/models/UserAccount';

interface LoginResponse {
    token: string;
    masterKeyEncrypted: string;
    masterKeyIv: string;
    salt: string;
    tag: string;
}

interface UserSecurityProfile {
    encryptedMasterKey: string;
    masterKeyIv: string;
    salt: string;
    tag?: string;
}

interface ErrorMessage {
    message: string;
}

export function isErrorMessage(obj: unknown): obj is ErrorMessage {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "message" in obj &&
        typeof (obj as Record<string, unknown>).message === "string"
    );
}
export class AuthApi extends ApiService {
    route: string = "/api/auth"

    async login(email: string, password: string): Promise<LoginResponse | ErrorMessage> {
        try {
            const response = await this.api.post(`${this.route}/login`, {
                email,
                password,
            });
            return response.data;
        } catch (error) {
            if (isAxiosError(error) && error.response?.data?.message) {
                return { message: error.response.data.message };
            }
            return { message: "An unknown error occurred." };
        }
    }

    async register(data: RegisterData): Promise<RegisterResponse> {
        const response = await this.api.post(`${this.route}/register`, data);
        return response.data;
    }

    async validate(): Promise<boolean> {
        try {
            const response = await this.api.get(`${this.route}/validate`);
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async getUserSecurityProfile(): Promise<UserSecurityProfile> {
        const response = await this.api.get(`${this.route}/user-security-profile`);
        return response.data;
    }
}

export const authApi = new AuthApi();