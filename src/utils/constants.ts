export const APP_NAME = "Grind Karo";

export const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { path: "/programs", label: "Programs", icon: "Dumbbell" },
  { path: "/plans", label: "Plans", icon: "CreditCard" },
  { path: "/subscriptions", label: "Subscriptions", icon: "Award" },
] as const;

export const PAGE_SIZES = [10, 25, 50] as const;

export const DEFAULT_PAGE_SIZE = 10;
