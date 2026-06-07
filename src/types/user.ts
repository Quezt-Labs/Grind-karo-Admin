// ---- Admin Users --------------------------------------------------------

import type { AthleteAssignment } from "@/types/athleteAssignment";

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN" | "ASSISTANT_COACH";
  plan: string | null;
  spreadsheetId?: string | null;
  sheetContentRevision?: number;
  workoutSetVideosEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateAdminUserRole = "USER" | "ASSISTANT_COACH";

export interface CreateAdminUserCoachingPayload {
  planId: string;
  totalAmount?: number;
}

export interface CreateAdminUserAssignmentPayload {
  assistantCoachId: string;
  personalCoachingEnabled?: boolean;
  formCheckEnabled?: boolean;
}

export interface CreateAdminUserPayload {
  email: string;
  name?: string;
  role: CreateAdminUserRole;
  password?: string;
  coaching?: CreateAdminUserCoachingPayload;
  assignment?: CreateAdminUserAssignmentPayload;
}

export interface CreateAdminUserResponse {
  user: {
    id: string;
    email: string;
    role: CreateAdminUserRole;
    created: boolean;
    name?: string | null;
  };
  coaching: {
    subscriptionId: string;
    planId: string;
    planName: string;
    totalAmount: number;
  } | null;
  assignment: AthleteAssignment | null;
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

export type PurchaseKind =
  | "coaching_subscription"
  | "program_purchase"
  | "book_purchase";

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

export interface BookPurchase {
  kind: "book_purchase";
  id: string;
  bookId: string;
  bookName: string;
  bookSlug: string;
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  amount: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
}

export type Purchase = CoachingPurchase | ProgramPurchase | BookPurchase;

export interface FormCheckQuota {
  weeklyLimit: number | null;
  usedThisWeek: number;
  remainingThisWeek: number | null;
  weekStart: string;
  weekEnd: string;
  planSlug: string | null;
  planName: string | null;
  subscriptionWeek?: number;
  formCheckWeekAllowed?: boolean;
  programWeeksReviewed?: number[];
}

export interface UserPurchasesResponse {
  user: AdminUser;
  purchases: Purchase[];
  formCheckQuota: FormCheckQuota;
  formCheckEnabled: boolean;
  chatEnabled: boolean;
}

// ---- User Progress ------------------------------------------------------

export interface UserProgressEntry {
  id: string;
  imageUrls: string[];
  imageUrl?: string | null;
  videoUrl: string | null;
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

// ---- Coaching intake (user_info) ----------------------------------------

export interface UserInfo {
  id: string;
  userId: string;
  name: string;
  age: number;
  height: string;
  currentBodyweightAndGoal: string;
  city: string;
  state: string | null;
  whatsappNumber: string;
  instagramId: string;
  resistanceTrainingExperience: string;
  timePerSession: string;
  competitionLevel: string;
  squatMax: string;
  squatStyle: string;
  benchMax: string;
  benchGripWidth: string;
  deadliftMax: string;
  deadliftStyle: string;
  pullUpsDips: string;
  trainingSplit: string;
  liftTrainingStyle: string;
  has125kgPlate: boolean;
  trainingDislikes: string;
  coachingGoal: string[];
  rpeExperience: string;
  pastPrograms: string;
  recoveryAbility: string;
  perceivedWeaknesses: string;
  injuries: string;
  hasWorkedWithCoach: boolean;
  commitmentLevel: string;
  trainingApproach: string;
  smokeDrink: string;
  hasUsedPEDs: boolean;
  caloriesMacrosDescription: string;
  dietQuality: string;
  physicallyDemandingJob: boolean;
  sleepHours: string;
  trainingDaysPerWeek: string;
  communicationFrequency: string;
  idealCoach: string;
  shortAndLongTermGoals: string;
  anythingElse: string | null;
  referralSources: string[];
  createdAt: string;
  updatedAt: string;
}

// ---- Coaching setup queue -----------------------------------------------

export type CoachingSetupStatus = "needs_intake" | "awaiting_sheet" | "ready";

export type CoachingSetupStatusFilter = CoachingSetupStatus | "all";

export interface CoachingSetupMember {
  id: string;
  name: string | null;
  email: string;
  setupStatus: CoachingSetupStatus;
  planName: string;
  city?: string | null;
  state?: string | null;
  expiresAt: string;
  subscribedAt: string;
  spreadsheetId?: string | null;
}

export interface CoachingSetupCounts {
  needsIntake: number;
  awaitingSheet: number;
  ready: number;
}

export interface CoachingSetupListResponse {
  total: number;
  limit: number;
  offset: number;
  counts: CoachingSetupCounts;
  items: CoachingSetupMember[];
}

// ---- Notifications ------------------------------------------------------

export type NotificationType =
  | "COACHING_SUBSCRIPTION_PAID"
  | "PROGRAM_PURCHASE_PAID"
  | "BOOK_PURCHASE_PAID"
  | "CHAT_MESSAGE"
  | "FORM_CHECK_VIDEO_UPLOAD";

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
