import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Dumbbell,
  Award,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useSidebarStore } from "@/store/sidebarStore";
import { APP_NAME } from "@/utils/constants";
import type { ReactNode } from "react";

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
  const location = useLocation();

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

        {/* Footer */}
        <div className="border-t border-gray-700 p-4">
          {!isCollapsed && (
            <p className="text-xs text-gray-400">© 2026 Grind Karo</p>
          )}
        </div>
      </aside>
    </>
  );
}
