import { cn } from "@/lib/utils";
import {
    Anchor,
    Box,
    Button,
    Paper,
    PasswordInput,
    Stack,
    Text,
    TextInput,
    Title,
    useMantineColorScheme,
} from "@mantine/core";

import * as yup from "yup";
import YupPassword from "yup-password";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
YupPassword(yup);

import { useEffect } from "react";
import {
    createSearchParams,
    Link,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import { Toast, useToast } from "@/hooks/use-toast";
import { useAccountStore } from "@/stores/AccountStore";
import { authApi, isErrorMessage } from "@/services/AuthApi";

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
        formState: { errors, isSubmitting },
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
            <Stack gap="lg">
                <TextInput
                    label="Email"
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="m@example.com"
                    required
                    error={errors.email?.message}
                    {...register("email")}
                />
                <PasswordInput
                    label="Password"
                    id="password"
                    autoComplete="current-password"
                    required
                    error={errors.password?.message}
                    {...register("password")}
                />
                <Button type="submit" fullWidth loading={isSubmitting}>
                    Login
                </Button>
            </Stack>
            <Text mt="md" ta="center" size="sm">
                Don&apos;t have an account?{" "}
                <Anchor component={Link} to="/signup" underline="always">
                    Sign up
                </Anchor>
            </Text>
        </form>
    );
};

export function LoginForm({
    className,
    ...props
}: Omit<React.ComponentPropsWithoutRef<"div">, "onSubmit">) {
    const { colorScheme } = useMantineColorScheme();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const {
        isAuthenticated,
        setIsAuthenticated,
        setCurrentPassword,
        setEncryptedMasterKey,
        setCurrentEmail,
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
                navigate("/accounts", { replace: true });
            }
        }
    }, [isAuthenticated, navigate, searchParams]);

    const handleLoginSuccess = (data: LoginSuccessData) => {
        setIsAuthenticated(true);
        setCurrentPassword(data.password);
        setCurrentEmail(data.email);
        setEncryptedMasterKey(data.response.masterKeyEncrypted);

        navigate("/accounts", { replace: true });
    };

    const bannerSrc =
        colorScheme === "dark"
            ? "./images/banner.png"
            : "./images/banner-light.png";

    return (
        <Box className={cn("flex w-full flex-col gap-6", className)} {...props}>
            <Paper withBorder radius="xl" shadow="sm" p="xl">
                <Stack gap="lg">
                    <Box>
                        <Box
                            component="img"
                            src={bannerSrc}
                            alt="AltShare"
                            maw={240}
                            w="100%"
                            mb="xs"
                            style={{ display: "block" }}
                        />
                        <Title order={2} size="h2">
                            Login
                        </Title>
                        <Text c="dimmed" size="sm" mt={4}>
                            Enter your information below to login to your account
                        </Text>
                    </Box>
                    <LoginFormFields onLoginSuccess={handleLoginSuccess} />
                </Stack>
            </Paper>
        </Box>
    );
}
