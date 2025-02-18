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

export class AuthApi extends ApiService {
    route: string = "/api/auth"

    async login(email: string, password: string): Promise<LoginResponse> {
        const response = await this.api.post(`${this.route}/login`, {
            email,
            password,
        });
        return response.data;
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