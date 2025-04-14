import { LoginForm } from "@/components/login-form";

export function Login() {
    return (
        <div className="h-screen flex flex-col items-center justify-center">
            <LoginForm className="w-[400px]" />
        </div>
    );
}
