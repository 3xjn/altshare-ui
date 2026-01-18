import axios, { AxiosInstance } from 'axios';

export class ApiService {
    protected api: AxiosInstance;
    
    constructor() {
        this.api = axios.create({
            headers: {
                'Content-Type': 'application/json',
            },
            withCredentials: true,
        });
    }
}
