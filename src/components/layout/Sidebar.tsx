import { useCallback, useMemo, useState } from "react";
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
  Video,
  FileText,
  Inbox,
  ChevronDown,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useSidebarStore } from "@/store/sidebarStore";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
import { APP_NAME } from "@/utils/constants";
import toast from "react-hot-toast";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { useFormCheckPendingCount } from "@/hooks/useFormCheckPendingCount";

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

type NavSection = {
  key: string;
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    key: "overview",
    title: "Overview",
    items: [{ path: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    key: "people",
    title: "People",
    items: [
      { path: "/coupons", label: "Coupons", icon: Ticket },
      { path: "/users", label: "Users", icon: Users },
      { path: "/form-checks", label: "Form checks", icon: Video },
      { path: "/chat", label: "Chat", icon: MessageCircle },
    ],
  },
  {
    key: "programs",
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
    key: "coaching",
    title: "Coaching",
    items: [
      { path: "/plans", label: "Plans", icon: CreditCard },
      { path: "/addons", label: "Coaching Add-ons", icon: Puzzle },
      { path: "/subscriptions", label: "Subscriptions", icon: Award },
      { path: "/reviews", label: "Coaching Reviews", icon: MessageSquare },
    ],
  },
  {
    key: "marketing",
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
];

const COACH_NAV_SECTIONS: NavSection[] = [
  {
    key: "coach",
    title: "Coaching",
    items: [
      { path: "/coach/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { path: "/coach/athletes", label: "My Athletes", icon: Users },
      { path: "/form-checks", label: "Form checks", icon: Video },
      { path: "/chat", label: "Chat", icon: MessageCircle },
    ],
  },
];

const COLLAPSED_STORAGE_KEY = "grind-karo-sidebar-collapsed";
const COLLAPSIBLE_SECTIONS = NAV_SECTIONS.filter((s) => s.items.length > 1);

function isNavActive(pathname: string, path: string): boolean {
  return pathname === path || (path !== "/" && pathname.startsWith(path + "/"));
}

function sectionIsActive(pathname: string, section: NavSection): boolean {
  return section.items.some((item) => isNavActive(pathname, item.path));
}

function activeItemInSection(
  pathname: string,
  section: NavSection,
): NavItem | undefined {
  return section.items.find((item) => isNavActive(pathname, item.path));
}

function readCollapsedSections(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function NavItemLink({
  item,
  active,
  onNavigate,
  compact = false,
  badgeCount,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
  compact?: boolean;
  badgeCount?: number;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg font-medium transition-all duration-200",
        compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
        active
          ? "bg-sidebar-active/90 text-white shadow-sm shadow-black/20"
          : "text-gray-400 hover:bg-white/5 hover:text-white",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-300" />
      )}
      <Icon
        className={cn(
          "shrink-0",
          compact ? "h-3.5 w-3.5" : "h-4 w-4",
          active ? "text-white" : "text-gray-500 group-hover:text-white",
        )}
      />
      <span className="truncate">{item.label}</span>
      {badgeCount != null && badgeCount > 0 && (
        <span className="ml-auto shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </NavLink>
  );
}

function CollapsibleNavSection({
  section,
  expanded,
  activeInSection,
  activeItem,
  onToggle,
  onNavigate,
  pathname,
  badgeByPath,
}: {
  section: NavSection;
  expanded: boolean;
  activeInSection: boolean;
  activeItem: NavItem | undefined;
  onToggle: () => void;
  onNavigate: () => void;
  pathname: string;
  badgeByPath?: Record<string, number>;
}) {
  return (
    <div
      className={cn(
        "rounded-xl transition-colors duration-200",
        activeInSection && "bg-white/[0.03] ring-1 ring-white/5",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors",
          "hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50",
        )}
      >
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
            expanded ? "bg-white/10" : "bg-transparent",
          )}
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-gray-400 transition-transform duration-300 ease-out",
              expanded ? "rotate-0" : "-rotate-90",
            )}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-[11px] font-semibold uppercase tracking-wider",
              activeInSection ? "text-gray-300" : "text-gray-500",
            )}
          >
            {section.title}
          </span>
        </span>

        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
            activeInSection
              ? "bg-primary-500/20 text-primary-200"
              : "bg-white/5 text-gray-500",
          )}
        >
          {section.items.length}
        </span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          expanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <ul className="space-y-0.5 px-1.5 pb-2 pt-0.5">
            {section.items.map((item) => (
              <li key={item.path}>
                <NavItemLink
                  item={item}
                  active={isNavActive(pathname, item.path)}
                  onNavigate={onNavigate}
                  badgeCount={badgeByPath?.[item.path]}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!expanded && activeItem && (
        <div className="border-t border-white/5 px-1.5 pb-2 pt-1">
          <NavItemLink
            item={activeItem}
            active
            onNavigate={onNavigate}
            compact
            badgeCount={badgeByPath?.[activeItem.path]}
          />
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { isMobileOpen, setMobileOpen } = useSidebarStore();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >(readCollapsedSections);

  const persistCollapsed = useCallback((next: Record<string, boolean>) => {
    setCollapsedSections(next);
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next));
  }, []);

  const toggleSection = useCallback(
    (key: string) => {
      persistCollapsed({
        ...collapsedSections,
        [key]: !collapsedSections[key],
      });
    },
    [collapsedSections, persistCollapsed],
  );

  const collapseAll = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const section of COLLAPSIBLE_SECTIONS) {
      next[section.key] = true;
    }
    persistCollapsed(next);
  }, [persistCollapsed]);

  const expandAll = useCallback(() => {
    persistCollapsed({});
  }, [persistCollapsed]);

  const allCollapsed = useMemo(
    () => COLLAPSIBLE_SECTIONS.every((s) => collapsedSections[s.key] === true),
    [collapsedSections],
  );

  const anyCollapsed = useMemo(
    () => COLLAPSIBLE_SECTIONS.some((s) => collapsedSections[s.key] === true),
    [collapsedSections],
  );

  const closeMobile = useCallback(() => setMobileOpen(false), [setMobileOpen]);
  const { data: formCheckPending = 0 } = useFormCheckPendingCount();
  const badgeByPath = useMemo(
    () =>
      formCheckPending > 0 ? { "/form-checks": formCheckPending } : undefined,
    [formCheckPending],
  );

  const navSections = useMemo(() => {
    if (user?.role === "ASSISTANT_COACH") {
      return COACH_NAV_SECTIONS;
    }
    return NAV_SECTIONS.map((section) => {
      if (section.key !== "people") return section;
      return {
        ...section,
        items: [
          section.items[0]!,
          section.items[1]!,
          {
            path: "/assistant-coaches",
            label: "Assistant coaches",
            icon: UserCog,
          },
          ...section.items.slice(2),
        ],
      };
    });
  }, [user?.role]);

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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
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
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-3 sm:h-16 sm:px-4">
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
          <div className="space-y-2">
            {navSections.map((section) => {
              if (section.items.length === 1) {
                const item = section.items[0]!;
                const active = isNavActive(location.pathname, item.path);
                return (
                  <div key={section.key}>
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                      {section.title}
                    </p>
                    <NavItemLink
                      item={item}
                      active={active}
                      onNavigate={closeMobile}
                      badgeCount={badgeByPath?.[item.path]}
                    />
                  </div>
                );
              }

              const expanded = collapsedSections[section.key] !== true;
              const activeInSection = sectionIsActive(
                location.pathname,
                section,
              );
              const activeItem = activeItemInSection(
                location.pathname,
                section,
              );

              return (
                <CollapsibleNavSection
                  key={section.key}
                  section={section}
                  expanded={expanded}
                  activeInSection={activeInSection}
                  activeItem={activeItem}
                  onToggle={() => toggleSection(section.key)}
                  onNavigate={closeMobile}
                  pathname={location.pathname}
                  badgeByPath={badgeByPath}
                />
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-center gap-1 border-t border-white/5 pt-3">
            <button
              type="button"
              onClick={expandAll}
              disabled={!anyCollapsed}
              className="rounded-md px-2 py-1 text-[10px] font-medium text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300 disabled:opacity-40"
            >
              Expand all
            </button>
            <span className="text-gray-700">·</span>
            <button
              type="button"
              onClick={collapseAll}
              disabled={allCollapsed}
              className="rounded-md px-2 py-1 text-[10px] font-medium text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300 disabled:opacity-40"
            >
              Collapse all
            </button>
          </div>
        </nav>

        <div className="shrink-0 border-t border-gray-700/50 p-3">
          {user && (
            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white ring-2 ring-white/10">
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
