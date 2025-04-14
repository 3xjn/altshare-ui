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
import { Dispatch, SetStateAction, useState } from "react";
import { Stack } from "./ui/stack";

interface AddAccountDialog {
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;
    handleSubmit: React.FormEventHandler<HTMLFormElement> | undefined;
}

const games = { "Marvel Rivals": "./images/marvel-rivals.png" };

export default function AddAccountDialog({
    open,
    setOpen,
    handleSubmit,
}: AddAccountDialog) {
    const [isRivals, setIsRivals] = useState(false);

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
                            <Label htmlFor="username">
                                {isRivals ? "Username (IGN)" : "Username"}
                            </Label>
                            <Input id="username" name="username" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                showPasswordToggle
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                name="notes"
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
