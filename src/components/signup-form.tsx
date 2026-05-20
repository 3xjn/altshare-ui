import { cn } from "@/lib/utils";
import {
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

import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import * as yup from "yup";
import YupPassword from "yup-password";
import { AccountCreationDto } from "@/models/UserAccount";
import { authApi } from "@/services/AuthApi";
import { setupUserEncryption } from "@/utils/encryption";
import { useAccountStore } from "@/stores/AccountStore";
YupPassword(yup);
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

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
        formState: { errors, isSubmitting },
    } = useForm<AccountCreationDto>({
        resolver: yupResolver(schema),
    });

    const { setIsAuthenticated, setCurrentPassword, setEncryptedMasterKey, setCurrentEmail } =
        useAccountStore();

    const onSubmit: SubmitHandler<AccountCreationDto> = async (data) => {
        try {
            let encryptedMasterKey;
            try {
                encryptedMasterKey = await setupUserEncryption(data.password);
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

            const response = await authApi.register({
                email: data.email,
                password: data.password,
                username: data.username,
                passwordConfirmation: data.passwordConfirmation,
                masterKeyEncrypted: encryptedMasterKey,
            });

            setEncryptedMasterKey(response.masterKeyEncrypted);
            setCurrentPassword(data.password);
            setCurrentEmail(data.email);

            // validate the new token
            const isValid = await authApi.validate();
            setIsAuthenticated(isValid);

            // if valid go to home page
            if (isValid) {
                navigate("/accounts", { replace: true });
            }
        } catch (error) {
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
            <Stack gap="lg">
                <TextInput
                    label="Email"
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    error={errors.email?.message}
                    {...register("email")}
                />
                <TextInput
                    label="Username"
                    id="username"
                    type="text"
                    required
                    error={errors.username?.message}
                    {...register("username")}
                />
                <PasswordInput
                    label="Password"
                    id="password"
                    autoComplete="new-password"
                    required
                    error={errors.password?.message}
                    {...register("password")}
                />
                <PasswordInput
                    label="Confirm Password"
                    id="confirm-password"
                    required
                    error={errors.passwordConfirmation?.message}
                    {...register("passwordConfirmation")}
                />
                <Button type="submit" fullWidth loading={isSubmitting}>
                    Signup
                </Button>
            </Stack>
        </form>
    );
};

export function SignupForm({
    className,
    ...props
}: React.ComponentPropsWithoutRef<"div">) {
    const { colorScheme } = useMantineColorScheme();
    const bannerSrc =
        colorScheme === "dark"
            ? "./images/banner.png"
            : "./images/banner-light.png";

    return (
        <Box className={cn("flex w-full flex-col gap-6", className)} {...props}>
            <Paper withBorder radius="xl" shadow="sm" p="xl">
                <Stack gap="lg">
                    <Box
                        component="img"
                        src={bannerSrc}
                        alt="AltShare"
                        maw={240}
                        w="100%"
                        mb="xs"
                        style={{ display: "block" }}
                    />
                    <Box>
                        <Title order={2} size="h2">
                            Create account
                        </Title>
                        <Text c="dimmed" size="sm" mt={4}>
                            Enter your information below to create your account
                        </Text>
                    </Box>
                    <MyForm />
                </Stack>
            </Paper>
        </Box>
    );
}
