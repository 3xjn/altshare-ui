import axios, { AxiosInstance } from 'axios';
import Cookies from 'js-cookie';

export class ApiService {
    protected api: AxiosInstance;
    
    constructor() {
        this.api = axios.create({
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.api.interceptors.request.use((config) => {
            const token = Cookies.get('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
    }

    protected getHeaders() {
        const token = Cookies.get('token');
        return {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }
}