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

import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import * as yup from "yup";
import YupPassword from "yup-password";
import { AccountCreationDto } from "@/models/UserAccount";
import { authApi } from "@/services/AuthApi";
import { setupUserEncryption } from "@/utils/encryption";
import { useAccountStore } from "@/stores/AccountStore";
YupPassword(yup);

import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// Define a specific error type with response data
interface ApiError extends Error {
    response?: {
        data?: {
            error?: string;
        };
    };
}

const schema = yup.object().shape({
    username: yup
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(15, "Username must be at most 15 characters")
        .required("Username is required"),
    email: yup
        .string()
        .email("Must be a valid email")
        .required("Email is required"),
    password: yup
        .string()
        .min(8, "Please use a more secure password (greater than 8 characters)")
        .minLowercase(1, "Password must contain at least 1 lowercase letter")
        .minUppercase(1, "Password must contain at least 1 uppercase letter")
        .minNumbers(1, "Password must contain at least 1 number")
        .minSymbols(1, "Password must contain at least 1 special character")
        .required("No password provided"),
    passwordConfirmation: yup
        .string()
        .oneOf([yup.ref("password")], "Passwords must match")
        .required("Please confirm your password"),
});

const MyForm = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<AccountCreationDto>({
        resolver: yupResolver(schema),
    });

    const { setIsAuthenticated, setCurrentPassword, setEncryptedMasterKey } = useAccountStore();

    const onSubmit: SubmitHandler<AccountCreationDto> = async (data) => {
        try {
            console.log(
                "Starting registration process with password:",
                data.password.substring(0, 1) +
                    "*".repeat(data.password.length - 1)
            );

            console.log("Initializing encryption...");

            let encryptedMasterKey;
            try {
                encryptedMasterKey = await setupUserEncryption(data.password);
                console.log(
                    "Encryption successful:",
                    encryptedMasterKey.substring(0, 10) + "..."
                );
            } catch (err) {
                if (err instanceof Error) {
                    toast({
                        variant: "destructive",
                        title: "Encryption Setup Error",
                        description: err.message, 
                    });
                }
                return;
            }

            console.log("Sending registration request...");
            const response = await authApi.register({
                email: data.email,
                password: data.password,
                username: data.username,
                passwordConfirmation: data.passwordConfirmation,
                masterKeyEncrypted: JSON.stringify(encryptedMasterKey),
            });

            if (response.token) {
                Cookies.set("token", response.token, {
                    path: "/",
                    sameSite: "strict",
                    expires: 1,
                });

                setEncryptedMasterKey(response.masterKeyEncrypted);
                setCurrentPassword(data.password);

                // validate the new token
                const isValid = await authApi.validate();
                setIsAuthenticated(isValid);

                // if valid go to home page
                if (isValid) {
                    navigate("/", { replace: true });
                }
            }
        } catch (error) {
            console.error("Registration failed:", error);
            let errorMessage = "An unknown error occurred";

            if (error instanceof Error) {
                errorMessage = error.message;

                const apiError = error as ApiError;
                if (apiError.response?.data?.error) {
                    errorMessage = apiError.response.data.error;
                }
            }

            toast({
                variant: "destructive",
                title: "Registration Failed",
                description: errorMessage,
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
                    <Label htmlFor="username">Username</Label>
                    <Input
                        id="username"
                        type="username"
                        required
                        {...register("username")}
                    />
                    {errors.username && (
                        <p className="text-xs text-red-500">
                            {errors.username.message}
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
                        autoComplete="new-password"
                        required
                        showPasswordToggle
                        {...register("password")}
                    />
                    {errors.password && (
                        <p className="text-xs text-red-500">
                            {errors.password.message}
                        </p>
                    )}
                </div>
                <div className="grid gap-2">
                    <div className="flex items-center">
                        <Label htmlFor="password">Confirm Password</Label>
                    </div>
                    <Input
                        id="confirm-password"
                        type="password"
                        required
                        {...register("passwordConfirmation")}
                    />
                    {errors.passwordConfirmation && (
                        <p className="text-xs text-red-500">
                            {errors.passwordConfirmation.message}
                        </p>
                    )}
                </div>
                <Button type="submit" className="w-full">
                    Signup
                </Button>
            </div>
        </form>
    );
};

export function SignupForm({
    className,
    ...props
}: React.ComponentPropsWithoutRef<"div">) {
    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">
                        Sign up to AltShare
                    </CardTitle>
                    <CardDescription>
                        Enter your email below to create your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <MyForm />
                </CardContent>
            </Card>
        </div>
    );
}