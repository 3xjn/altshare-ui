import { fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";

import type { SharingRelationship } from "@/services/AccountApi";
import { mantineTheme } from "@/theme/mantine-theme";

import { SharingModal } from "./SharingModal";

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

const relationship: SharingRelationship = {
    id: "share-1",
    groupId: "group-1",
    groupName: "Shared Group",
    sharedWithEmail: "friend@example.com",
    createdAt: "2025-01-15T00:00:00.000Z",
};

describe("SharingModal", () => {
    it("shows loading state and disables refresh while data is loading", () => {
        renderWithMantine(
            <SharingModal
                open
                isLoading
                sharingRelationships={[]}
                groupLookup={new Map()}
                revokeTarget={null}
                isRevoking={false}
                onOpenChange={vi.fn()}
                onRefresh={vi.fn()}
                onRevokeCancel={vi.fn()}
                onRevokeConfirm={vi.fn()}
                onSelectRevokeTarget={vi.fn()}
            />
        );

        expect(screen.getByText("Loading shared access...")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
    });

    it("shows the empty state when there are no active shares", () => {
        renderWithMantine(
            <SharingModal
                open
                isLoading={false}
                sharingRelationships={[]}
                groupLookup={new Map()}
                revokeTarget={null}
                isRevoking={false}
                onOpenChange={vi.fn()}
                onRefresh={vi.fn()}
                onRevokeCancel={vi.fn()}
                onRevokeConfirm={vi.fn()}
                onSelectRevokeTarget={vi.fn()}
            />
        );

        expect(
            screen.getByText("No active shares yet. Use Invite to share a group.")
        ).toBeInTheDocument();
    });

    it("supports refresh and revoke flows without changing container logic", () => {
        const onRefresh = vi.fn();
        const onSelectRevokeTarget = vi.fn();
        const onRevokeCancel = vi.fn();
        const onRevokeConfirm = vi.fn();

        const { rerender } = renderWithMantine(
            <SharingModal
                open
                isLoading={false}
                sharingRelationships={[relationship]}
                groupLookup={new Map([["group-1", "Fallback Group"]])}
                revokeTarget={null}
                isRevoking={false}
                onOpenChange={vi.fn()}
                onRefresh={onRefresh}
                onRevokeCancel={onRevokeCancel}
                onRevokeConfirm={onRevokeConfirm}
                onSelectRevokeTarget={onSelectRevokeTarget}
            />
        );

        expect(screen.getByText("Shared Group")).toBeInTheDocument();
        expect(screen.getByText(/shared with friend@example.com/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
        fireEvent.click(screen.getByRole("button", { name: "Revoke" }));

        expect(onRefresh).toHaveBeenCalledTimes(1);
        expect(onSelectRevokeTarget).toHaveBeenCalledWith(relationship);

        rerender(
            <MantineProvider theme={mantineTheme} forceColorScheme="light">
                <SharingModal
                    open
                    isLoading={false}
                    sharingRelationships={[relationship]}
                    groupLookup={new Map([["group-1", "Fallback Group"]])}
                    revokeTarget={relationship}
                    isRevoking={false}
                    onOpenChange={vi.fn()}
                    onRefresh={onRefresh}
                    onRevokeCancel={onRevokeCancel}
                    onRevokeConfirm={onRevokeConfirm}
                    onSelectRevokeTarget={onSelectRevokeTarget}
                />
            </MantineProvider>
        );

        expect(
            screen.getByText("Revoke access for friend@example.com?")
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        fireEvent.click(screen.getByRole("button", { name: "Revoke access" }));

        expect(onRevokeCancel).toHaveBeenCalledTimes(1);
        expect(onRevokeConfirm).toHaveBeenCalledTimes(1);
    });
});
