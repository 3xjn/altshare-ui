import { LoginForm } from "@/components/login-form";

export function Login() {
    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
            <LoginForm className="w-full max-w-sm" />
        </div>
    );
}
