import { ApiService } from './ApiService';

interface AddAccountRequest {
    encryptedData: string;
    groupId?: string;
}

interface EncryptedAccount {
    id: string;
    encryptedData: string;
    groupId?: string;
}

interface SharedEncryptedAccount {
    id?: string;
    encryptedData: string;
    groupId?: string;
    encryptedGroupKey: string;
    iv: string;
    salt: string;
    tag: string;
}

interface CreateSharingRequest {
    sharedWithEmail: string;
    groupId: string;
    encryptedGroupKey: string;
    iv: string;
    salt: string;
    tag: string;
}

interface SharedAccountResponse {
    encryptedAccounts: SharedEncryptedAccount[];
}

export interface SharingRelationship {
    id: string;
    sharedWithEmail: string;
    groupId: string;
    groupName: string;
    createdAt: string;
}

interface RankResponse {
    rank: string;
}

export class AccountApi extends ApiService {
    route: string = "/api/account"

    async getAccounts(): Promise<EncryptedAccount[]> {
        const response = await this.api.get(this.route);
        return response.data;
    }

    async addAccount(data: AddAccountRequest): Promise<void> {
        await this.api.post(this.route, data);
    }

    async editAccount(id: string, data: AddAccountRequest): Promise<void> {
        await this.api.put(`${this.route}/${id}`, data);
    }

    async deleteAccount(id: string): Promise<void> {
        await this.api.delete(`${this.route}/${id}`);
    }

    async createSharingRelationship(data: CreateSharingRequest): Promise<void> {
        await this.api.post(`${this.route}/share`, data);
    }

    async getSharedAccounts(): Promise<SharedAccountResponse> {
        const response = await this.api.get(`${this.route}/share`);
        return response.data;
    }

    async getSharingRelationships(): Promise<SharingRelationship[]> {
        const response = await this.api.get(`${this.route}/share/relationships`);
        return response.data;
    }

    async revokeSharingRelationship(id: string): Promise<void> {
        await this.api.delete(`${this.route}/share/relationships/${id}`);
    }

    async getRank(username: string): Promise<RankResponse> {
        const response = await this.api.get(`${this.route}/rank`, {
            params: { username },
            validateStatus: function (status) {
                return status <= 500;
            }
        });
        return response.data;
    }
}

export const accountApi = new AccountApi(); 
