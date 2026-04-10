export const APP_NAME = 'Admin Dashboard';

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/users', label: 'Users', icon: 'Users' },
  { path: '/settings', label: 'Settings', icon: 'Settings' },
] as const;

export const PAGE_SIZES = [10, 25, 50] as const;

export const DEFAULT_PAGE_SIZE = 10;
