import { ApiService } from './ApiService';

interface AddAccountRequest {
    encryptedData: string;
}

interface EncryptedAccount {
    id: string;
    encryptedData: string;
}

interface CreateSharingRequest {
    sharedWithEmail: string;
    encryptedMasterKey: string;
    iv: string;
    salt: string;
    tag: string;
}

interface SharedAccountResponse {
    encryptedAccounts: EncryptedAccount[];
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

    async getRank(username: string): Promise<RankResponse> {
        const response = await this.api.get(`${this.route}/rank?username=${username}`, {
            validateStatus: function (status) {
                return status <= 500;
            }
        });
        return response.data;
    }
}

export const accountApi = new AccountApi(); 