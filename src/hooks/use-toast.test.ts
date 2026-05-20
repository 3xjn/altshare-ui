import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast, useToast } from "@/hooks/use-toast";

describe("useToast", () => {
    beforeEach(() => {
        vi.useRealTimers();
        const { result, unmount } = renderHook(() => useToast());
        act(() => {
            result.current.dismiss();
        });
        unmount();
    });

    it("keeps only the newest toast when limit is one", () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            toast({ title: "First toast" });
            toast({ title: "Second toast" });
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0]?.title).toBe("Second toast");
    });

    it("preserves destructive variant data on created toasts", () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            toast({
                variant: "destructive",
                title: "Failure",
                description: "Something went wrong",
            });
        });

        expect(result.current.toasts[0]).toMatchObject({
            variant: "destructive",
            title: "Failure",
            description: "Something went wrong",
            open: true,
        });
    });

    it("supports update and dismiss lifecycle for a created toast", () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => useToast());

        let createdToast!: ReturnType<typeof toast>;

        act(() => {
            createdToast = toast({ title: "Original title" });
        });

        act(() => {
            createdToast.update({
                id: createdToast.id,
                title: "Updated title",
                description: "Updated description",
                open: true,
            });
        });

        expect(result.current.toasts[0]).toMatchObject({
            id: createdToast.id,
            title: "Updated title",
            description: "Updated description",
            open: true,
        });

        act(() => {
            createdToast.dismiss();
        });

        expect(result.current.toasts[0]).toMatchObject({
            id: createdToast.id,
            open: false,
        });

        act(() => {
            vi.advanceTimersByTime(1_000_000);
        });

        expect(result.current.toasts).toEqual([]);
    });
});
