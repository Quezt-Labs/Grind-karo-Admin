import { Menu, Sun, Moon, LogOut } from "lucide-react";
import { useSidebarStore } from "@/store/sidebarStore";
import { useAuth } from "@/hooks/useAuth";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export function Navbar() {
  const { setMobileOpen } = useSidebarStore();
  const { user, logout } = useAuth();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  }

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

        {user && (
          <div className="flex items-center gap-3 border-l pl-3 dark:border-gray-600">
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user.role}
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-white">
              {user.name.charAt(0)}
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Logout"
        >
          <LogOut className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </header>
  );
}
