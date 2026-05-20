import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

vi.mock("./pages/Accounts.tsx", () => ({
    Accounts: () => <div>accounts route</div>,
}));

vi.mock("./pages/Signup.tsx", () => ({
    Signup: () => <div>signup route</div>,
}));

vi.mock("./pages/Invite.tsx", () => ({
    Invite: () => <div>invite route</div>,
}));

vi.mock("./pages/Login.tsx", () => ({
    Login: () => <div data-testid="login-route">login route</div>,
}));

describe("AppRoot", () => {
    afterEach(() => {
        window.history.pushState({}, "", "/");
    });

    it("renders the login route within the root provider stack", async () => {
        window.history.pushState({}, "", "/login");

        const { AppRoot } = await import("./main.tsx");

        render(<AppRoot />);

        expect(screen.getByTestId("login-route")).toHaveTextContent(
            "login route"
        );
    }, 10_000);
});
