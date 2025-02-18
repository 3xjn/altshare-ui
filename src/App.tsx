import "./App.css";
import { Home } from "lucide-react";
import { Menubar, MenubarMenu, MenubarTrigger } from "./components/ui/menubar";

function App() {
    return (
        <Menubar className="fixed top-0 left-0 w-full bg-white shadow-md z-50">
            <MenubarMenu>
                <MenubarTrigger className="px-4 py-2 hover:bg-gray-100">
                    <Home className="mr-2 h-4 w-4" />
                    Home
                </MenubarTrigger>
            </MenubarMenu>
        </Menubar>
    );
}

export default App;
