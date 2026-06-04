import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  Puzzle,
  Award,
  MessageSquare,
  Users,
  X,
  LogOut,
  Dumbbell,
  BookOpen,
  ShoppingBag,
  Star,
  MonitorSmartphone,
  Ticket,
  MessageCircle,
  FileText,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useSidebarStore } from "@/store/sidebarStore";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
import { APP_NAME } from "@/utils/constants";
import toast from "react-hot-toast";
import { useState } from "react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [{ path: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Marketing",
    items: [
      {
        path: "/landing-pages",
        label: "Landing Pages",
        icon: MonitorSmartphone,
      },
      { path: "/contact", label: "Contact Inbox", icon: Inbox },
    ],
  },
  {
    title: "Coaching",
    items: [
      { path: "/plans", label: "Plans", icon: CreditCard },
      { path: "/addons", label: "Coaching Add-ons", icon: Puzzle },
      { path: "/subscriptions", label: "Subscriptions", icon: Award },
      { path: "/reviews", label: "Coaching Reviews", icon: MessageSquare },
    ],
  },
  {
    title: "Programs",
    items: [
      { path: "/programs", label: "Programs", icon: BookOpen },
      { path: "/program-books", label: "Program Books", icon: FileText },
      { path: "/program-addons", label: "Program Add-ons", icon: Puzzle },
      {
        path: "/program-purchases",
        label: "Purchases",
        icon: ShoppingBag,
      },
      { path: "/program-reviews", label: "Program Reviews", icon: Star },
      { path: "/exercises", label: "Exercises", icon: Dumbbell },
    ],
  },
  {
    title: "People",
    items: [
      { path: "/coupons", label: "Coupons", icon: Ticket },
      { path: "/users", label: "Users", icon: Users },
      { path: "/chat", label: "Chat", icon: MessageCircle },
    ],
  },
];

function isNavActive(pathname: string, path: string): boolean {
  return pathname === path || (path !== "/" && pathname.startsWith(path + "/"));
}

export function Sidebar() {
  const { isMobileOpen, setMobileOpen } = useSidebarStore();
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
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 shrink-0 flex-col bg-sidebar text-white transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src="/grind-karo-logo.png"
              alt={APP_NAME}
              className="h-9 w-9 shrink-0 rounded-md"
            />
            <span className="truncate text-lg font-bold">{APP_NAME}</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1 hover:bg-sidebar-hover lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-4 last:mb-0">
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(location.pathname, item.path);
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-sidebar-active/80 text-white"
                            : "text-gray-400 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-300" />
                        )}
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active
                              ? "text-white"
                              : "text-gray-500 group-hover:text-white",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-gray-700/50 p-3">
          {user && (
            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white ring-2 ring-white/10">
                {(user.name || user.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {user.name ?? user.email}
                </p>
                <p className="truncate text-xs text-gray-400">{user.role}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
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
