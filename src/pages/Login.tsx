import { LoginForm } from "@/components/login-form";
// import { base64ToArrayBuffer } from "@/utils/crypto";
// import { authApi } from "@/services/AuthApi";
// import { useAccountContext } from "@/stores/AccountProvider";
// import { deriveEncryptionKey } from "@/utils/crypto";

export function Login() {
    // const { setMasterKey } = useAccountContext();

    // const handleLogin = async (data: LoginFormData) => {
    //     const { password } = data;
        
    //     // 1. Get security parameters from server
    //     const { encryptedMasterKey, masterKeyIv: iv, salt } = await authApi.getUserSecurityProfile();
        
    //     // 2. Derive key using PBKDF2
    //     const derivedKey = await deriveEncryptionKey(
    //         password,
    //         base64ToArrayBuffer(salt)
    //     );

    //     // 3. Decrypt master key
    //     const decryptedKey = await crypto.subtle.decrypt(
    //         { name: 'AES-GCM', iv: base64ToArrayBuffer(iv) },
    //         derivedKey,
    //         base64ToArrayBuffer(encryptedMasterKey)
    //     );

    //     // 4. Import and store master key
    //     const masterKey = await crypto.subtle.importKey(
    //         'raw',
    //         decryptedKey,
    //         { name: 'AES-GCM', length: 256 },
    //         true,
    //         ['encrypt', 'decrypt']
    //     );
    //     setMasterKey(masterKey);
    // };

    return (
        <div className="h-screen flex flex-col items-center justify-center">
            <LoginForm className="w-[400px]" />
        </div>
    );
}
