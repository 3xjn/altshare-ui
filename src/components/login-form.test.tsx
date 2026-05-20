import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import {
    MemoryRouter,
    Route,
    Routes,
    useLocation,
} from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mantineTheme } from "@/theme/mantine-theme";
import { authApi } from "@/services/AuthApi";
import { useAccountStore } from "@/stores/AccountStore";

import { LoginForm } from "./login-form";

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
        login: vi.fn(),
    },
    isErrorMessage: (value: unknown): value is { message: string } =>
        typeof value === "object" &&
        value !== null &&
        "message" in value &&
        typeof value.message === "string",
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

type LoginStoreSlice = {
    isAuthenticated: boolean;
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

function renderWithProviders(
    initialEntry: string,
    colorScheme: "light" | "dark" = "light"
) {
    return render(
        <MantineProvider theme={mantineTheme} forceColorScheme={colorScheme}>
            <MemoryRouter initialEntries={[initialEntry]}>
                <Routes>
                    <Route path="/login" element={<LoginForm />} />
                    <Route
                        path="/invite"
                        element={<LocationProbe testId="invite-route" />}
                    />
                    <Route
                        path="/accounts"
                        element={<LocationProbe testId="home-route" />}
                    />
                </Routes>
            </MemoryRouter>
        </MantineProvider>
    );
}

describe("LoginForm", () => {
    const mockedUseAccountStore = vi.mocked(useAccountStore);
    const mockedLogin = vi.mocked(authApi.login);

    let store: LoginStoreSlice;

    beforeEach(() => {
        toastSpy.mockReset();
        mockedLogin.mockReset();

        store = {
            isAuthenticated: false,
            setIsAuthenticated: vi.fn(),
            setCurrentPassword: vi.fn(),
            setEncryptedMasterKey: vi.fn(),
            setCurrentEmail: vi.fn(),
        };

        mockedUseAccountStore.mockImplementation(() => store);
    });

    it("shows the expired-session toast from the query string", async () => {
        renderWithProviders("/login?expired=true");

        await waitFor(() => {
            expect(toastSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Session Expired",
                    description:
                        "Your session has expired. Please log in again.",
                    variant: "destructive",
                })
            );
        });
    });

    it("shows a destructive toast when the login API returns an error message", async () => {
        mockedLogin.mockResolvedValueOnce({ message: "Invalid email or password" });

        renderWithProviders("/login");

        fireEvent.change(screen.getByLabelText(/^Email/), {
            target: { value: "person@example.com" },
        });
        fireEvent.change(screen.getByLabelText(/^Password/), {
            target: { value: "Password123!" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Login" }));

        await waitFor(() => {
            expect(toastSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Login Failed",
                    description: "Invalid email or password",
                    variant: "destructive",
                })
            );
        });

        expect(store.setIsAuthenticated).not.toHaveBeenCalled();
    });

    it("shows a submitting state, updates the auth store, and navigates home on success", async () => {
        const loginRequest = createDeferred<{ masterKeyEncrypted: string }>();
        mockedLogin.mockReturnValueOnce(loginRequest.promise);

        renderWithProviders("/login");

        fireEvent.change(screen.getByLabelText(/^Email/), {
            target: { value: "person@example.com" },
        });
        fireEvent.change(screen.getByLabelText(/^Password/), {
            target: { value: "Password123!" },
        });

        const submitButton = screen.getByRole("button", { name: "Login" });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(submitButton).toBeDisabled();
        });

        loginRequest.resolve({ masterKeyEncrypted: "encrypted-master-key" });

        await waitFor(() => {
            expect(store.setIsAuthenticated).toHaveBeenCalledWith(true);
        });

        expect(store.setCurrentEmail).toHaveBeenCalledWith("person@example.com");
        expect(store.setCurrentPassword).toHaveBeenCalledWith("Password123!");
        expect(store.setEncryptedMasterKey).toHaveBeenCalledWith(
            "encrypted-master-key"
        );

        await waitFor(() => {
            expect(screen.getByTestId("home-route")).toHaveTextContent("/accounts");
        });
    });

    it("uses the dark-safe banner asset in dark mode", () => {
        renderWithProviders("/login", "dark");

        expect(screen.getByAltText("AltShare")).toHaveAttribute(
            "src",
            "./images/banner.png"
        );
    });
});
