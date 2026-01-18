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
}

export const groupApi = new GroupApi();
