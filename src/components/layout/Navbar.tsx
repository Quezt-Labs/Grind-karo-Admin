import { Menu, Sun, Moon } from "lucide-react";
import { useSidebarStore } from "@/store/sidebarStore";
import { useDarkMode } from "@/hooks/useDarkMode";
import { NotificationBell } from "./NotificationBell";
import { ContactInboxBell } from "./ContactInboxBell";

export function Navbar() {
  const { setMobileOpen } = useSidebarStore();
  const { isDark, toggle: toggleDark } = useDarkMode();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 dark:bg-gray-800 lg:px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
        >
          <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <ContactInboxBell />
        <NotificationBell />
        <button
          onClick={toggleDark}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-gray-300" />
          ) : (
            <Moon className="h-5 w-5 text-gray-600" />
          )}
        </button>
      </div>
    </header>
  );
}
