import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": string
}

export const getCurrentUserEmail = (): string | null => {
    const token = Cookies.get('token');
    if (!token) return null;

    try {
        const decoded = jwtDecode<JwtPayload>(token);
        return decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"];
    } catch {
        return null;
    }
};