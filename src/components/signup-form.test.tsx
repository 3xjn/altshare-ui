import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import {
    MemoryRouter,
    Route,
    Routes,
    useLocation,
} from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authApi } from "@/services/AuthApi";
import { useAccountStore } from "@/stores/AccountStore";
import { mantineTheme } from "@/theme/mantine-theme";
import { setupUserEncryption } from "@/utils/encryption";

import { SignupForm } from "./signup-form";

const { toastSpy } = vi.hoisted(() => ({
    toastSpy: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({
        toast: toastSpy,
        dismiss: vi.fn(),
        toasts: [],
    }),
}));

vi.mock("@/stores/AccountStore", () => ({
    useAccountStore: vi.fn(),
}));

vi.mock("@/services/AuthApi", () => ({
    authApi: {
        register: vi.fn(),
        validate: vi.fn(),
    },
}));

vi.mock("@/utils/encryption", () => ({
    setupUserEncryption: vi.fn(),
}));

if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        }),
    });
}

type SignupStoreSlice = {
    setIsAuthenticated: (value: boolean) => void;
    setCurrentPassword: (password: string) => void;
    setEncryptedMasterKey: (key: string) => void;
    setCurrentEmail: (email: string) => void;
};

function createDeferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}

function LocationProbe({ testId }: { testId: string }) {
    const location = useLocation();

    return <div data-testid={testId}>{`${location.pathname}${location.search}`}</div>;
}

function fillSignupForm() {
    fireEvent.change(screen.getByLabelText(/^Email/), {
        target: { value: "person@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Username/), {
        target: { value: "altshare-user" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
        target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm Password/), {
        target: { value: "Password123!" },
    });
}

function renderWithProviders(
    initialEntry = "/signup",
    colorScheme: "light" | "dark" = "light"
) {
    return render(
        <MantineProvider theme={mantineTheme} forceColorScheme={colorScheme}>
            <MemoryRouter initialEntries={[initialEntry]}>
                <Routes>
                    <Route path="/signup" element={<SignupForm />} />
                    <Route
                        path="/accounts"
                        element={<LocationProbe testId="home-route" />}
                    />
                </Routes>
            </MemoryRouter>
        </MantineProvider>
    );
}

describe("SignupForm", () => {
    const mockedUseAccountStore = vi.mocked(useAccountStore);
    const mockedRegister = vi.mocked(authApi.register);
    const mockedValidate = vi.mocked(authApi.validate);
    const mockedSetupUserEncryption = vi.mocked(setupUserEncryption);

    let store: SignupStoreSlice;

    beforeEach(() => {
        toastSpy.mockReset();
        mockedRegister.mockReset();
        mockedValidate.mockReset();
        mockedSetupUserEncryption.mockReset();

        store = {
            setIsAuthenticated: vi.fn(),
            setCurrentPassword: vi.fn(),
            setEncryptedMasterKey: vi.fn(),
            setCurrentEmail: vi.fn(),
        };

        mockedUseAccountStore.mockImplementation(() => store);
    });

    it("shows a submitting state, stores auth data, and navigates home after a valid signup", async () => {
        const registerRequest = createDeferred<{ masterKeyEncrypted: string }>();

        mockedSetupUserEncryption.mockResolvedValueOnce("encrypted-master-key");
        mockedRegister.mockReturnValueOnce(registerRequest.promise);
        mockedValidate.mockResolvedValueOnce(true);

        renderWithProviders();
        fillSignupForm();

        const submitButton = screen.getByRole("button", { name: "Signup" });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(submitButton).toBeDisabled();
        });

        registerRequest.resolve({ masterKeyEncrypted: "server-master-key" });

        await waitFor(() => {
            expect(store.setEncryptedMasterKey).toHaveBeenCalledWith(
                "server-master-key"
            );
        });

        expect(mockedRegister).toHaveBeenCalledWith({
            email: "person@example.com",
            password: "Password123!",
            username: "altshare-user",
            passwordConfirmation: "Password123!",
            masterKeyEncrypted: "encrypted-master-key",
        });
        expect(store.setCurrentPassword).toHaveBeenCalledWith("Password123!");
        expect(store.setCurrentEmail).toHaveBeenCalledWith("person@example.com");
        expect(store.setIsAuthenticated).toHaveBeenCalledWith(true);

        await waitFor(() => {
            expect(screen.getByTestId("home-route")).toHaveTextContent("/accounts");
        });
    });

    it("shows an encryption toast and does not call register when encryption setup fails", async () => {
        mockedSetupUserEncryption.mockRejectedValueOnce(
            new Error("Unable to create encryption key")
        );

        renderWithProviders();
        fillSignupForm();

        fireEvent.click(screen.getByRole("button", { name: "Signup" }));

        await waitFor(() => {
            expect(toastSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Encryption Setup Error",
                    description: "Unable to create encryption key",
                    variant: "destructive",
                })
            );
        });

        expect(mockedRegister).not.toHaveBeenCalled();
    });

    it("prefers the API error payload when registration fails", async () => {
        const apiError = new Error("Request failed") as Error & {
            response: { data: { error: string } };
        };
        apiError.response = {
            data: {
                error: "Email is already registered",
            },
        };

        mockedSetupUserEncryption.mockResolvedValueOnce("encrypted-master-key");
        mockedRegister.mockRejectedValueOnce(apiError);

        renderWithProviders();
        fillSignupForm();

        fireEvent.click(screen.getByRole("button", { name: "Signup" }));

        await waitFor(() => {
            expect(toastSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Registration Failed",
                    description: "Email is already registered",
                    variant: "destructive",
                })
            );
        });

        expect(mockedValidate).not.toHaveBeenCalled();
    });

    it("uses the dark-safe banner asset in dark mode", () => {
        renderWithProviders("/signup", "dark");

        expect(screen.getByAltText("AltShare")).toHaveAttribute(
            "src",
            "./images/banner.png"
        );
    });
});
