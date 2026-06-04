import { Menu, Sun, Moon } from "lucide-react";
import { useSidebarStore } from "@/store/sidebarStore";
import { useDarkMode } from "@/hooks/useDarkMode";
import { NotificationBell } from "./NotificationBell";
import { ContactInboxBell } from "./ContactInboxBell";
import { ChatBell } from "./ChatBell";

export function Navbar() {
  const { setMobileOpen } = useSidebarStore();
  const { isDark, toggle: toggleDark } = useDarkMode();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-white px-3 dark:bg-gray-800 sm:h-16 sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
        <ChatBell />
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
