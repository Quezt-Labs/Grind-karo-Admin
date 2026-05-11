// ---- Admin Users --------------------------------------------------------

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  plan: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Purchaser extends AdminUser {
  coachingSubscriptionsCount: number;
  programPurchasesCount: number;
  totalSpent: number;
  lastPurchaseAt: string;
}

export interface PaginatedResponse<T> {
  total: number;
  limit: number;
  offset: number;
  items: T[];
}

// ---- User Purchases -----------------------------------------------------

export type PurchaseKind = "coaching_subscription" | "program_purchase";

export interface CoachingPurchase {
  kind: "coaching_subscription";
  id: string;
  planId: string;
  planName: string;
  planSlug: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  totalAmount: number;
  currency: string;
  startDate: string;
  expiresAt: string;
  createdAt: string;
}

export interface ProgramPurchase {
  kind: "program_purchase";
  id: string;
  programId: string;
  programName: string;
  programSlug: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  amount: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
}

export type Purchase = CoachingPurchase | ProgramPurchase;

export interface UserPurchasesResponse {
  user: AdminUser;
  purchases: Purchase[];
}

// ---- User Progress ------------------------------------------------------

export interface UserProgressEntry {
  id: string;
  imageUrl: string;
  notes: string | null;
  weight: string | null;
  createdAt: string;
}

export interface UserProgressResponse {
  total: number;
  limit: number;
  offset: number;
  items: UserProgressEntry[];
}

// ---- Plan Users (by-plan API) -------------------------------------------

export type PlanUserSubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";
export type PlanUserStatusFilter = "all" | "active" | "past";

export interface PlanUserItem {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: "USER" | "ADMIN";
    plan: "FREE" | "PRO" | "ENTERPRISE" | null;
    createdAt: string;
    updatedAt: string;
  };
  subscription: {
    id: string;
    status: PlanUserSubscriptionStatus;
    startDate: string;
    expiresAt: string;
    totalAmount: number;
    razorpayPaymentId: string | null;
    createdAt: string;
  };
}

export interface ListPlanUsersResponse {
  total: number;
  limit: number;
  offset: number;
  items: PlanUserItem[];
}

// ---- Notifications ------------------------------------------------------

export type NotificationType =
  | "COACHING_SUBSCRIPTION_PAID"
  | "PROGRAM_PURCHASE_PAID";

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  total: number;
  unreadCount: number;
  limit: number;
  offset: number;
  items: AdminNotification[];
}
