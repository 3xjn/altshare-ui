import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Settings, Share, Users } from "lucide-react";

type AccountsHeaderProps = {
    isConnecting: boolean;
    onRefresh: () => void;
    onInvite: () => void;
    onOpenSharing: () => void;
    onExportData: () => void;
    onLogout: () => void;
};

export function AccountsHeader({
    isConnecting,
    onRefresh,
    onInvite,
    onOpenSharing,
    onExportData,
    onLogout,
}: AccountsHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            <img
                className="rounded-md mb-2 w-[15%] h-[15%]"
                src="./images/banner-light.png"
                alt="AltShare"
            />
            <div className="flex items-center gap-3">
                <Button onClick={onRefresh} variant="outline" size="sm">
                    <RefreshCcw />
                    Refresh
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onInvite}
                    disabled={isConnecting}
                >
                    {isConnecting ? (
                        <>
                            <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            Connecting...
                        </>
                    ) : (
                        <>
                            <Share className="mr-2 h-4 w-4" />
                            Invite
                        </>
                    )}
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                            <Users className="h-4 w-4" />
                            <span className="sr-only">
                                Open sharing manager
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Sharing</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onSelect={onOpenSharing}
                            className="cursor-pointer"
                        >
                            Accounts
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={onInvite}
                            className="cursor-pointer"
                        >
                            Invites
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                    <DropdownMenuTrigger>
                        <Settings size={24} strokeWidth={1.5} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={onExportData}
                            className="cursor-pointer"
                        >
                            Export data
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={onLogout}
                            className="cursor-pointer"
                        >
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
