import "../services/SignalR";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Stack } from "./ui/stack";
import type { AccountGroup } from "@/stores/AccountStore";

interface DefaultValues {
    game?: string;
    username?: string;
    password?: string;
    notes?: string;
    groupId?: string;
}
interface AddAccountDialog {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    handleSubmit: React.FormEventHandler<HTMLFormElement> | undefined;
    defaultValues?: DefaultValues;
    groups: AccountGroup[];
    defaultGroupId: string | null;
}

const games = { "Marvel Rivals": "./images/marvel-rivals.png" };

export default function AddAccountDialog({
    open,
    setOpen,
    handleSubmit,
    defaultValues,
    groups,
    defaultGroupId,
}: AddAccountDialog) {
    const [isRivals, setIsRivals] = useState(false);
    const initialGroupId = useMemo(() => {
        return (
            defaultValues?.groupId ||
            defaultGroupId ||
            groups[0]?.id ||
            ""
        );
    }, [defaultValues?.groupId, defaultGroupId, groups]);

    useEffect(() => {
        setIsRivals(defaultValues?.game === "Marvel Rivals");
    }, [defaultValues?.game]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add account</DialogTitle>
                    <DialogDescription>
                        Add your account credentials to be securely stored.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="game">Game</Label>
                            <Select
                                onValueChange={(value) =>
                                    setIsRivals(value == "Marvel Rivals")
                                }
                                defaultValue={defaultValues?.game ?? "None"}
                                name="game"
                            >
                                <SelectTrigger className="w-full py-5">
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem
                                        value="None"
                                        className="cursor-pointer flex items-center"
                                    >
                                        None
                                    </SelectItem>
                                    {Object.entries(games).map(
                                        ([game, img]) => (
                                            <SelectItem
                                                key={game}
                                                className="cursor-pointer"
                                                value={game}
                                            >
                                                <Stack
                                                    direction="row"
                                                    align="center"
                                                    spacing="small"
                                                >
                                                    <img
                                                        className="w-[30px] h-[30px] object-cover rounded-md"
                                                        src={img}
                                                        alt={game}
                                                    />
                                                    <span>{game}</span>
                                                </Stack>
                                            </SelectItem>
                                        )
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="groupId">Group</Label>
                            <Select
                                name="groupId"
                                defaultValue={initialGroupId}
                            >
                                <SelectTrigger className="w-full py-5">
                                    <SelectValue placeholder="Select a group" />
                                </SelectTrigger>
                                <SelectContent>
                                    {groups.map((group) => (
                                        <SelectItem
                                            key={group.id}
                                            value={group.id}
                                            className="cursor-pointer"
                                        >
                                            {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="username">
                                {isRivals ? "Username (IGN)" : "Username"}
                            </Label>
                            <Input
                                id="username"
                                name="username"
                                defaultValue={defaultValues?.username ?? ""}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                defaultValue={defaultValues?.password ?? ""}
                                required
                                showPasswordToggle
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                name="notes"
                                defaultValue={defaultValues?.notes ?? ""}
                                className="min-h-[100px] resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            className="w-full"
                            variant="secondary"
                        >
                            Add account
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
