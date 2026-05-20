import { act, render, screen, waitFor } from "@testing-library/react";
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

import { Invite } from "./Invite";

const inviteHarness = vi.hoisted(() => {
    const toastSpy = vi.fn();
    const signalRInstances: MockSignalRService[] = [];
    const peerInstances: MockPeerService[] = [];

    class MockSignalRService {
        public connection = {
            invoke: vi.fn(async () => {}),
        };

        public connect = vi.fn(async () => {});
        public disconnect = vi.fn(async () => {});

        constructor(
            public callbacks: {
                receiveSignal?: (signal: string) => void;
            }
        ) {
            signalRInstances.push(this);
        }
    }

    class MockPeerService {
        public handlers: Record<string, (payload: unknown) => unknown> = {};
        public onConnect?: () => void | Promise<void>;
        public signal = vi.fn();
        public sendMessage = vi.fn();
        public initiate = vi.fn();

        constructor() {
            peerInstances.push(this);
        }

        public registerHandler(action: string, handler: (payload: unknown) => unknown) {
            this.handlers[action] = handler;
        }
    }

    return {
        toastSpy,
        signalRInstances,
        peerInstances,
        MockSignalRService,
        MockPeerService,
    };
});

vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({
        toast: inviteHarness.toastSpy,
        dismiss: vi.fn(),
        toasts: [],
    }),
}));

vi.mock("@/stores/AccountStore", () => ({
    useAccountStore: vi.fn(),
}));

vi.mock("@/services/AuthApi", () => ({
    authApi: {
        getCurrentUser: vi.fn(),
    },
}));

vi.mock("@/services/SignalR", () => ({
    SignalRService: inviteHarness.MockSignalRService,
}));

vi.mock("@/services/PeerService", () => ({
    PeerService: inviteHarness.MockPeerService,
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

type InviteStoreSlice = {
    isAuthenticated: boolean;
    currentPassword: string | null;
    currentEmail: string | null;
    setCurrentEmail: (email: string) => void;
};

function LocationProbe({ testId }: { testId: string }) {
    const location = useLocation();

    return <div data-testid={testId}>{`${location.pathname}${location.search}`}</div>;
}

function renderWithProviders(initialEntry: string) {
    return render(
        <MantineProvider theme={mantineTheme} forceColorScheme="light">
            <MemoryRouter initialEntries={[initialEntry]}>
                <Routes>
                    <Route path="/invite" element={<Invite />} />
                    <Route
                        path="/login"
                        element={<LocationProbe testId="login-route" />}
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

describe("Invite", () => {
    const mockedUseAccountStore = vi.mocked(useAccountStore);
    const mockedGetCurrentUser = vi.mocked(authApi.getCurrentUser);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    let store: InviteStoreSlice;

    beforeEach(() => {
        inviteHarness.toastSpy.mockReset();
        inviteHarness.signalRInstances.length = 0;
        inviteHarness.peerInstances.length = 0;
        mockedGetCurrentUser.mockReset();
        consoleErrorSpy.mockClear();
        consoleLogSpy.mockClear();

        store = {
            isAuthenticated: true,
            currentPassword: "Password123!",
            currentEmail: "person@example.com",
            setCurrentEmail: vi.fn(),
        };

        mockedUseAccountStore.mockImplementation(() => store);
    });

    it("redirects unauthenticated users to login with the invite code intact", async () => {
        store.isAuthenticated = false;

        renderWithProviders("/invite?code=room-123");

        await waitFor(() => {
            expect(screen.getByTestId("login-route")).toHaveTextContent(
                "/login?code=room-123"
            );
        });
    });

    it("redirects home when the invite code is missing", async () => {
        renderWithProviders("/invite");

        await waitFor(() => {
            expect(screen.getByTestId("home-route")).toHaveTextContent("/accounts");
        });
    });

    it("connects to the invite room, shows the waiting stage, and keeps the back action disabled while busy", async () => {
        renderWithProviders("/invite?code=room-123");

        expect(screen.getByText("Connecting")).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText("Waiting for the sharer")).toBeInTheDocument();
        });

        expect(inviteHarness.signalRInstances).toHaveLength(1);
        expect(inviteHarness.peerInstances).toHaveLength(1);
        expect(inviteHarness.signalRInstances[0]?.connect).toHaveBeenCalledTimes(1);
        expect(
            inviteHarness.signalRInstances[0]?.connection.invoke
        ).toHaveBeenCalledWith("JoinRoom", "room-123");
        expect(inviteHarness.peerInstances[0]?.initiate).toHaveBeenCalledWith(
            false,
            "room-123"
        );
        expect(
            screen.getByRole("button", { name: "Back to accounts" })
        ).toBeDisabled();
    });

    it("moves to the error stage and shows a toast when a group key arrives without a current password", async () => {
        store.currentPassword = null;

        renderWithProviders("/invite?code=room-123");

        await waitFor(() => {
            expect(inviteHarness.peerInstances).toHaveLength(1);
        });

        const groupKeyHandler = inviteHarness.peerInstances[0]?.handlers.groupKey;
        expect(groupKeyHandler).toBeTypeOf("function");

        await act(async () => {
            await groupKeyHandler?.({
                groupId: "group-1",
                key: "c2VjcmV0",
            });
        });

        await waitFor(() => {
            expect(inviteHarness.toastSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: "Missing password",
                    description:
                        "Please log in again to complete the invite.",
                    variant: "destructive",
                })
            );
        });

        expect(screen.getByText("Connection failed")).toBeInTheDocument();
        expect(screen.getByText("Failed")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Back to accounts" })
        ).not.toBeDisabled();
    });
});
