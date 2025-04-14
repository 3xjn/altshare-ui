import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import * as yup from "yup";
import YupPassword from "yup-password";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
YupPassword(yup);

import { useEffect } from "react";
import {
    createSearchParams,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import { Toast, useToast } from "@/hooks/use-toast";
import { useAccountStore } from "@/stores/AccountStore";
import { authApi, isErrorMessage } from "@/services/AuthApi";
import Cookies from "js-cookie";

export interface LoginFormData {
    email: string;
    password: string;
}

const schema = yup.object().shape({
    email: yup
        .string()
        .email("Must be a valid email")
        .required("Email is required"),
    password: yup.string().required("No password provided"),
});

const toastSettings: Partial<Toast> = {
    variant: "destructive",
    duration: 3000,
};

interface LoginSuccessData extends LoginFormData {
    response: {
        masterKeyEncrypted: string;
        masterKeyIv: string;
        salt: string;
        tag: string;
    };
}

interface LoginFormProps {
    onLoginSuccess: (data: LoginSuccessData) => void;
}

const LoginFormFields = ({ onLoginSuccess }: LoginFormProps) => {
    const { toast } = useToast();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: yupResolver(schema),
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            const response = await authApi.login(data.email, data.password);

            if (isErrorMessage(response)) {
                toast({
                    ...toastSettings,
                    title: "Login Failed",
                    description: response.message,
                });
                return;
            }

            Cookies.set("token", response.token);
            onLoginSuccess({ ...data, response });
        } catch {
            toast({
                ...toastSettings,
                title: "Login Failed",
                description: "Unexpected error. Please try again later.",
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="m@example.com"
                        required
                        {...register("email")}
                    />
                    {errors.email && (
                        <p className="text-xs text-red-500">
                            {errors.email.message}
                        </p>
                    )}
                </div>
                <div className="grid gap-2">
                    <div className="flex items-center">
                        <Label htmlFor="password">Password</Label>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        showPasswordToggle
                        required
                        {...register("password")}
                    />
                    {errors.password && (
                        <p className="text-xs text-red-500">
                            {errors.password.message}
                        </p>
                    )}
                </div>
                <Button type="submit" className="w-full">
                    Login
                </Button>
            </div>
            <div className="mt-4 text-center text-sm">
                Don&apos;t have an account?{" "}
                <a href="../signup" className="underline underline-offset-4">
                    Sign up
                </a>
            </div>
        </form>
    );
};

export function LoginForm({
    className,
    ...props
}: Omit<React.ComponentPropsWithoutRef<"div">, "onSubmit">) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const {
        isAuthenticated,
        setIsAuthenticated,
        setCurrentPassword,
        setEncryptedMasterKey,
    } = useAccountStore();

    useEffect(() => {
        if (searchParams.get("expired") === "true") {
            toast({
                ...toastSettings,
                title: "Session Expired",
                description: "Your session has expired. Please log in again.",
            });
        }
    }, [searchParams, toast]);

    useEffect(() => {
        if (isAuthenticated) {
            const inviteCode = searchParams.get("code");
            if (inviteCode) {
                // go back to invite page, once auth
                navigate(
                    {
                        pathname: "/invite",
                        search: createSearchParams({
                            code: inviteCode,
                        }).toString(),
                    },
                    { replace: true }
                );
            } else {
                // not from invite, go to main page
                navigate("/", { replace: true });
            }
        }
    }, [isAuthenticated, navigate]);

    const handleLoginSuccess = (data: LoginSuccessData) => {
        setIsAuthenticated(true);
        setCurrentPassword(data.password);
        setEncryptedMasterKey(data.response.masterKeyEncrypted);

        navigate("/", { replace: true });
    };

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="pt-6">
                    <img
                        className="rounded-md mx-[24px] mb-2 scale-75"
                        src="./images/banner-light.png"
                    />
                    <CardTitle className="text-2xl">Login</CardTitle>
                    <CardDescription>
                        Enter your information below to login to your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <LoginFormFields onLoginSuccess={handleLoginSuccess} />
                </CardContent>
            </Card>
        </div>
    );
}
