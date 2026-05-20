import { act, render, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast, useToast } from "@/hooks/use-toast";

const notificationSpies = vi.hoisted(() => ({
    hide: vi.fn(),
    show: vi.fn(),
    update: vi.fn(),
}));

vi.mock("@mantine/notifications", () => ({
    Notifications: () => <div data-testid="mantine-notifications" />,
    notifications: notificationSpies,
}));

import { Toaster } from "./toaster";

describe("Toaster", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        const { result, unmount } = renderHook(() => useToast());

        act(() => {
            result.current.dismiss();
        });

        unmount();
    });

    it("hides replaced notifications so only the newest toast stays visible", async () => {
        render(<Toaster />);

        let firstToast!: ReturnType<typeof toast>;
        let secondToast!: ReturnType<typeof toast>;

        act(() => {
            firstToast = toast({ title: "First toast" });
        });

        await waitFor(() => {
            expect(notificationSpies.show).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: firstToast.id,
                    title: "First toast",
                })
            );
        });

        act(() => {
            secondToast = toast({ title: "Second toast" });
        });

        await waitFor(() => {
            expect(notificationSpies.hide).toHaveBeenCalledWith(firstToast.id);
        });

        await waitFor(() => {
            expect(notificationSpies.show).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: secondToast.id,
                    title: "Second toast",
                })
            );
        });
    });

    it("maps variants and lifecycle updates onto Mantine notifications", async () => {
        render(<Toaster />);

        let defaultToast!: ReturnType<typeof toast>;

        act(() => {
            defaultToast = toast({
                title: "Saved",
                description: "Changes stored",
            });
        });

        await waitFor(() => {
            expect(notificationSpies.show).toHaveBeenCalled();
        });

        expect(notificationSpies.show.mock.calls.at(-1)?.[0]).toMatchObject({
            id: defaultToast.id,
            title: "Saved",
            autoClose: 5000,
            withCloseButton: true,
        });
        expect(notificationSpies.show.mock.calls.at(-1)?.[0]?.color).toBeUndefined();

        let destructiveToast!: ReturnType<typeof toast>;

        act(() => {
            destructiveToast = toast({
                variant: "destructive",
                title: "Failure",
                description: "Something went wrong",
            });
        });

        await waitFor(() => {
            expect(notificationSpies.hide).toHaveBeenCalledWith(defaultToast.id);
        });

        expect(notificationSpies.show.mock.calls.at(-1)?.[0]).toMatchObject({
            id: destructiveToast.id,
            title: "Failure",
            color: "red",
            autoClose: 5000,
            withCloseButton: true,
        });

        act(() => {
            destructiveToast.update({
                id: destructiveToast.id,
                variant: "destructive",
                title: "Still failing",
                description: "Please try again",
                open: true,
            });
        });

        await waitFor(() => {
            expect(notificationSpies.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: destructiveToast.id,
                    title: "Still failing",
                    color: "red",
                })
            );
        });

        act(() => {
            destructiveToast.dismiss();
        });

        await waitFor(() => {
            expect(notificationSpies.hide).toHaveBeenCalledWith(
                destructiveToast.id
            );
        });
    });
});
