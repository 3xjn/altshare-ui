import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";

import { mantineTheme } from "@/theme/mantine-theme";

import { InviteModal } from "./InviteModal";

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

function renderWithMantine(ui: React.ReactNode) {
    return render(
        <MantineProvider theme={mantineTheme} forceColorScheme="light">
            {ui}
        </MantineProvider>
    );
}

const groups = [
    {
        id: "personal",
        name: "Personal",
        usesMasterKey: true,
        encryptedGroupKey: null,
    },
    {
        id: "shared",
        name: "Shared",
        usesMasterKey: false,
        encryptedGroupKey: null,
    },
];

describe("InviteModal", () => {
    it("creates invites and keeps footer close separate from modal open change", () => {
        const onCreateInvite = vi.fn();
        const onOpenChange = vi.fn();
        const onClose = vi.fn();

        renderWithMantine(
            <InviteModal
                open
                shareOpen={false}
                inviteeEmail={null}
                inviteCode={null}
                isConnecting={false}
                groups={groups}
                defaultGroupId="personal"
                shareGroupId={null}
                onShareGroupIdChange={vi.fn()}
                onShareGroup={vi.fn()}
                onCreateInvite={onCreateInvite}
                onEndInvite={vi.fn()}
                onOpenChange={onOpenChange}
                onClose={onClose}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: "Create invite" }));
        fireEvent.click(screen.getByText("Close"));

        expect(onCreateInvite).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("shows the invite link flow and ends an active invite", () => {
        const onEndInvite = vi.fn();

        renderWithMantine(
            <InviteModal
                open
                shareOpen={false}
                inviteeEmail={null}
                inviteCode="room-123"
                isConnecting={false}
                groups={groups}
                defaultGroupId="personal"
                shareGroupId={null}
                onShareGroupIdChange={vi.fn()}
                onShareGroup={vi.fn()}
                onCreateInvite={vi.fn()}
                onEndInvite={onEndInvite}
                onOpenChange={vi.fn()}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText(/keep this window open until they connect/i)).toBeInTheDocument();
        expect(screen.getByText(/\/invite\?code=room-123/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "End invite" }));

        expect(onEndInvite).toHaveBeenCalledTimes(1);
    });

    it("defaults the share group and keeps share actions controlled", () => {
        const onShareGroupIdChange = vi.fn();
        const onShareGroup = vi.fn();
        const onOpenChange = vi.fn();

        renderWithMantine(
            <InviteModal
                open
                shareOpen
                inviteeEmail="friend@example.com"
                inviteCode={null}
                isConnecting={false}
                groups={groups}
                defaultGroupId="shared"
                shareGroupId={null}
                onShareGroupIdChange={onShareGroupIdChange}
                onShareGroup={onShareGroup}
                onCreateInvite={vi.fn()}
                onEndInvite={vi.fn()}
                onOpenChange={onOpenChange}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText("friend@example.com")).toBeInTheDocument();
        expect(screen.getByLabelText("Group to share")).toHaveValue("shared");

        fireEvent.change(screen.getByLabelText("Group to share"), {
            target: { value: "personal" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Share group" }));
        fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

        expect(onShareGroupIdChange).toHaveBeenCalledWith("personal");
        expect(onShareGroup).toHaveBeenCalledTimes(1);
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
