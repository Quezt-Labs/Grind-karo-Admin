export interface DashboardBreakdownItem {
  revenue: number;
  count: number;
}

export interface DashboardOverview {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueChangePercent: number;
  totalSalesCount: number;
  salesThisMonth: number;
  salesLastMonth: number;
  salesChangePercent: number;
  breakdown: {
    coaching: DashboardBreakdownItem;
    programs: DashboardBreakdownItem;
    books: DashboardBreakdownItem;
  };
  activeSubscriptions: number;
  uniqueCustomers: number;
}

export interface MonthlyRevenuePoint {
  month: string;
  label: string;
  revenue: number;
  salesCount: number;
}

export type RecentSaleKind =
  | "coaching_subscription"
  | "program_purchase"
  | "book_purchase";

export interface RecentSale {
  id: string;
  kind: RecentSaleKind;
  userId: string;
  userName: string | null;
  userEmail: string;
  productName: string;
  amount: number;
  paidAt: string;
}

export interface TopCustomer {
  userId: string;
  userName: string | null;
  userEmail: string;
  totalSpent: number;
  purchaseCount: number;
  lastPurchaseAt: string;
}

export interface DashboardOverviewResponse {
  overview: DashboardOverview;
  monthlyRevenue: MonthlyRevenuePoint[];
  recentSales: RecentSale[];
  topCustomers: TopCustomer[];
}
