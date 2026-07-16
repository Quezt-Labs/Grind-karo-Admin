export const APP_NAME = "Grind Karo";

export const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { path: "/plans", label: "Plans", icon: "CreditCard" },
  { path: "/addons", label: "Add-ons", icon: "Puzzle" },
  { path: "/subscriptions", label: "Subscriptions", icon: "Award" },
  { path: "/programs", label: "Programs", icon: "BookOpen" },
  { path: "/program-books", label: "Program Books", icon: "FileText" },
  { path: "/exercises", label: "Exercises", icon: "Dumbbell" },
  {
    path: "/program-purchases",
    label: "Program Purchases",
    icon: "ShoppingBag",
  },
  { path: "/users", label: "Users", icon: "Users" },
  { path: "/reviews", label: "Reviews", icon: "MessageSquare" },
  { path: "/program-reviews", label: "Program Reviews", icon: "Star" },
  { path: "/landing-pages", label: "Landing Page", icon: "MonitorSmartphone" },
  { path: "/coupons", label: "Coupons", icon: "Ticket" },
  { path: "/polls", label: "Polls", icon: "Vote" },
] as const;

export const PAGE_SIZES = [10, 25, 50] as const;

export const DEFAULT_PAGE_SIZE = 10;
