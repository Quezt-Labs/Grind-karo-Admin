import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Dumbbell,
  Award,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useSidebarStore } from "@/store/sidebarStore";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
import { APP_NAME } from "@/utils/constants";
import toast from "react-hot-toast";
import { useState } from "react";
import type { ReactNode } from "react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

const iconMap: Record<string, ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="h-5 w-5" />,
  Dumbbell: <Dumbbell className="h-5 w-5" />,
  Award: <Award className="h-5 w-5" />,
  MessageSquare: <MessageSquare className="h-5 w-5" />,
};

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { path: "/programs", label: "Programs", icon: "Dumbbell" },
  { path: "/subscriptions", label: "Subscriptions", icon: "Award" },
  { path: "/reviews", label: "Reviews", icon: "MessageSquare" },
];

export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggle, setMobileOpen } =
    useSidebarStore();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await authService.logout();
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
    setIsLoggingOut(false);
    setShowLogoutModal(false);
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full flex-col bg-sidebar text-white transition-all duration-300 lg:relative lg:z-auto",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <img
              src="/grind-karo-logo.png"
              alt={APP_NAME}
              className="h-9 w-9 shrink-0 rounded-md"
            />
            {!isCollapsed && (
              <span className="text-lg font-bold truncate">{APP_NAME}</span>
            )}
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 hover:bg-sidebar-hover lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={toggle}
            className="hidden rounded-lg p-1 hover:bg-sidebar-hover lg:block"
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 flex-1 space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" &&
                location.pathname.startsWith(item.path + "/"));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-active text-white"
                    : "text-gray-300 hover:bg-sidebar-hover hover:text-white",
                  isCollapsed && "justify-center px-2",
                )}
              >
                {iconMap[item.icon]}
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Profile & Logout */}
        <div className="border-t border-gray-700/50 p-3">
          {user && (
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl bg-white/5 p-2.5",
                isCollapsed && "justify-center bg-transparent p-0",
              )}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/10"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white ring-2 ring-white/10">
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
              {!isCollapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {user.name || user.email}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {user.role}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          )}
          {isCollapsed && user && (
            <button
              onClick={() => setShowLogoutModal(true)}
              className="mt-2 flex w-full items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-sidebar-hover hover:text-white"
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
      </aside>

      <ConfirmModal
        open={showLogoutModal}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        variant="danger"
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
}
