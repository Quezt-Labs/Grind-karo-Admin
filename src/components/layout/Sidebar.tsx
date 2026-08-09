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
  Vote,
  MessageCircle,
  Video,
  FileText,
  Inbox,
  Bug,
  Upload,
  ChevronDown,
  UserCog,
  MapPin,
  Megaphone,
  ClipboardCheck,
  PlayCircle,
  LayoutList,
  Briefcase,
  CalendarClock,
  Calculator,
  Gauge,
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
import { useChatUnreadTotal } from "@/hooks/useChatBadges";

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
    items: [
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { path: "/workspace", label: "Workspace", icon: Briefcase },
    ],
  },
  {
    key: "people",
    title: "People",
    items: [
      { path: "/coupons", label: "Coupons", icon: Ticket },
      { path: "/polls", label: "Polls", icon: Vote },
      { path: "/users", label: "Users", icon: Users },
      { path: "/form-checks", label: "Form checks", icon: Video },
      {
        path: "/form-check-action-queue",
        label: "Form-check queue",
        icon: ClipboardCheck,
      },
      { path: "/form-check-sla", label: "Form-check SLA", icon: Gauge },
      { path: "/chat", label: "Chat", icon: MessageCircle },
      {
        path: "/upload-incidents",
        label: "Upload incidents",
        icon: Upload,
      },
      { path: "/client-errors", label: "Client errors", icon: Bug },
      { path: "/upload-failures", label: "Upload failures", icon: Upload },
    ],
  },
  {
    key: "programs",
    title: "Programs",
    items: [
      { path: "/programs", label: "Programs", icon: BookOpen },
      { path: "/program-templates", label: "Templates", icon: LayoutList },
      { path: "/program-books", label: "Program Books", icon: FileText },
      { path: "/program-addons", label: "Program Add-ons", icon: Puzzle },
      {
        path: "/program-purchases",
        label: "Purchases",
        icon: ShoppingBag,
      },
      { path: "/program-reviews", label: "Program Reviews", icon: Star },
      { path: "/exercises", label: "Exercises", icon: Dumbbell },
      { path: "/rpe-calculator", label: "RPE calculator", icon: Calculator },
    ],
  },
  {
    key: "coaching",
    title: "Coaching",
    items: [
      { path: "/coach/locations", label: "Athlete locations", icon: MapPin },
      { path: "/coach/ops-board", label: "Daily ops", icon: ClipboardCheck },
      { path: "/plans", label: "Plans", icon: CreditCard },
      { path: "/addons", label: "Coaching Add-ons", icon: Puzzle },
      { path: "/subscriptions", label: "Subscriptions", icon: Award },
      {
        path: "/coaching-renewals",
        label: "Renewals & overdue",
        icon: CalendarClock,
      },
      { path: "/reviews", label: "Coaching Reviews", icon: MessageSquare },
      { path: "/big-lift-pr", label: "Big 3 PRs", icon: Dumbbell },
      { path: "/announcements", label: "Announcements", icon: Megaphone },
      { path: "/video-library", label: "Video Library", icon: PlayCircle },
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
      { path: "/workspace", label: "Workspace", icon: Briefcase },
      { path: "/coach/athletes", label: "My Athletes", icon: Users },
      { path: "/coach/ops-board", label: "Daily ops", icon: ClipboardCheck },
      { path: "/coach/locations", label: "Locations", icon: MapPin },
      { path: "/form-checks", label: "Form checks", icon: Video },
      {
        path: "/form-check-action-queue",
        label: "Action queue",
        icon: ClipboardCheck,
      },
      { path: "/form-check-sla", label: "SLA", icon: Gauge },
      {
        path: "/upload-incidents",
        label: "Upload incidents",
        icon: Upload,
      },
      {
        path: "/coaching-renewals",
        label: "Renewals & overdue",
        icon: CalendarClock,
      },
      { path: "/chat", label: "Chat", icon: MessageCircle },
    ],
  },
  {
    key: "programs",
    title: "Programs",
    items: [
      { path: "/plans", label: "Coaching Plans", icon: CreditCard },
      { path: "/programs", label: "Programs", icon: BookOpen },
      { path: "/program-templates", label: "Templates", icon: LayoutList },
      { path: "/exercises", label: "Exercises", icon: Dumbbell },
      { path: "/rpe-calculator", label: "RPE calculator", icon: Calculator },
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
  collapsed = false,
  badgeCount,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
  compact?: boolean;
  collapsed?: boolean;
  badgeCount?: number;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center rounded-lg font-medium transition-all duration-200",
        collapsed
          ? "justify-center px-2 py-2.5"
          : cn(
              "gap-3",
              compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
            ),
        active
          ? "bg-sidebar-active/90 text-white shadow-sm shadow-black/20"
          : "text-gray-400 hover:bg-white/5 hover:text-white",
      )}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-300" />
      )}
      {active && collapsed && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-primary-300" />
      )}
      <span className="relative shrink-0">
        <Icon
          className={cn(
            collapsed ? "h-5 w-5" : compact ? "h-3.5 w-3.5" : "h-4 w-4",
            active ? "text-white" : "text-gray-500 group-hover:text-white",
          )}
        />
        {collapsed && badgeCount != null && badgeCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-500 px-0.5 text-[8px] font-bold text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </span>
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {badgeCount != null && badgeCount > 0 && (
            <span className="ml-auto shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </>
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
  const { isMobileOpen, setMobileOpen, isCollapsed } = useSidebarStore();
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
  const showRail = isCollapsed && !isMobileOpen;
  const { data: formCheckPending = 0 } = useFormCheckPendingCount();
  const { data: chatUnread = 0 } = useChatUnreadTotal();
  const badgeByPath = useMemo((): Record<string, number> | undefined => {
    const badges: Record<string, number> = {};
    if (formCheckPending > 0) badges["/form-checks"] = formCheckPending;
    if (chatUnread > 0) badges["/chat"] = chatUnread;
    return Object.keys(badges).length > 0 ? badges : undefined;
  }, [formCheckPending, chatUnread]);

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
          "fixed left-0 top-0 z-50 flex h-full shrink-0 flex-col bg-sidebar text-white transition-[width,transform] duration-300 lg:static lg:z-auto lg:translate-x-0",
          showRail ? "w-[4.25rem]" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-white/10 sm:h-16",
            showRail
              ? "justify-center px-2"
              : "justify-between px-3 sm:justify-start sm:px-4",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 items-center",
              showRail ? "justify-center" : "gap-2",
            )}
          >
            <img
              src="/grind-karo-logo.png"
              alt={APP_NAME}
              className="h-9 w-9 shrink-0 rounded-md"
            />
            {!showRail && (
              <span className="truncate text-lg font-bold">{APP_NAME}</span>
            )}
          </div>
          <div
            className={cn(
              "flex items-center gap-1 lg:hidden",
              showRail && "hidden",
            )}
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1 hover:bg-sidebar-hover"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-3">
          <div className={cn("space-y-2", showRail && "space-y-0.5")}>
            {showRail
              ? navSections.map((section, sectionIndex) => (
                  <div key={section.key}>
                    {sectionIndex > 0 && (
                      <div
                        className="my-2 border-t border-white/5"
                        aria-hidden
                      />
                    )}
                    <ul className="space-y-0.5">
                      {section.items.map((item) => (
                        <li key={item.path}>
                          <NavItemLink
                            item={item}
                            active={isNavActive(location.pathname, item.path)}
                            onNavigate={closeMobile}
                            collapsed
                            badgeCount={badgeByPath?.[item.path]}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              : navSections.map((section) => {
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

          {!showRail && (
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
          )}
        </nav>

        <div className="shrink-0 border-t border-gray-700/50 p-3">
          {user && (
            <>
              <div
                className={cn(
                  "flex items-center rounded-xl bg-white/5",
                  showRail ? "justify-center p-2" : "gap-3 p-2.5",
                )}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white ring-2 ring-white/10"
                  title={showRail ? (user.name ?? user.email) : undefined}
                >
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </div>
                {!showRail && (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {user.name ?? user.email}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        {user.role}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLogoutModal(true)}
                      className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                      title="Logout"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              {showRail && (
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="mt-2 flex w-full justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </>
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
