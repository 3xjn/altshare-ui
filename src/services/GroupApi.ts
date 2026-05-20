import { ApiService } from './ApiService';

export interface AccountGroupResponse {
    id: string;
    name: string;
    usesMasterKey: boolean;
    encryptedGroupKey?: string | null;
}

interface CreateGroupRequest {
    name: string;
    encryptedGroupKey: string;
}

interface UpdateGroupRequest {
    name: string;
}

export class GroupApi extends ApiService {
    route: string = "/api/group";

    async getGroups(): Promise<AccountGroupResponse[]> {
        const response = await this.api.get(this.route);
        return response.data;
    }

    async createGroup(data: CreateGroupRequest): Promise<AccountGroupResponse> {
        const response = await this.api.post(this.route, data);
        return response.data;
    }

    async renameGroup(id: string, data: UpdateGroupRequest): Promise<AccountGroupResponse> {
        const response = await this.api.put(`${this.route}/${id}`, data);
        return response.data;
    }

    async deleteGroup(id: string): Promise<void> {
        await this.api.delete(`${this.route}/${id}`);
    }
}

export const groupApi = new GroupApi();
