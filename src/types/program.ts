// ---- Enums --------------------------------------------------------------
export type CoachingSubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

// ---- Add-ons (public inline) --------------------------------------------
export interface PublicAddon {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number; // INR rupees (integer)
}

// ---- Plans --------------------------------------------------------------
export interface CoachingPlan {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price: number; // INR rupees (integer)
  validityMonths: number;
  includedFeatures: string[];
  excludedFeatures: string[];
  badge: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  availableAddons: PublicAddon[];
  totalReviews: number;
  averageRating: number;
}

export interface CreateCoachingPlanPayload {
  slug: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  price: number;
  validityMonths: number;
  includedFeatures: string[];
  excludedFeatures?: string[];
  badge?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export type UpdateCoachingPlanPayload = Partial<CreateCoachingPlanPayload>;

// ---- Add-ons (admin) ----------------------------------------------------
export interface CoachingAddon {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCoachingAddonPayload {
  slug: string;
  name: string;
  description?: string | null;
  price: number;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateCoachingAddonPayload = Partial<CreateCoachingAddonPayload>;

// ---- Program add-ons (admin) --------------------------------------------
export interface ProgramAddon {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  grantsFormCheck: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProgramAddonPayload {
  slug: string;
  name: string;
  description?: string | null;
  price: number;
  grantsFormCheck?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateProgramAddonPayload = Partial<CreateProgramAddonPayload>;

// ---- Plan ↔ Add-on links ------------------------------------------------
export interface PlanAddonLink {
  planId: string;
  addonId: string;
  priceOverride: number | null;
  createdAt: string;
}

export interface LinkAddonPayload {
  addonId: string;
  priceOverride?: number | null;
}

export interface UpdateAddonLinkPayload {
  priceOverride?: number | null;
}

// ---- Subscriptions ------------------------------------------------------
export interface PlanSnapshot {
  slug: string;
  name: string;
  price: number;
  validityMonths: number;
}

export interface AddonSnapshot {
  addonId: string;
  slug: string;
  name: string;
  pricePaid: number;
}

export interface CoachingSubscription {
  id: string;
  userId: string;
  planId: string;
  status: CoachingSubscriptionStatus;
  startDate: string;
  expiresAt: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  baseAmount: number;
  addonsAmount: number;
  totalAmount: number;
  planSnapshot: PlanSnapshot;
  addonsSnapshot: AddonSnapshot[];
  createdAt: string;
  updatedAt: string;
}

// ---- Reviews ------------------------------------------------------------
export interface CoachingReview {
  id: string;
  planId: string;
  name: string;
  email: string;
  rating: number;
  title: string;
  review: string;
  imgUrl: string | null;
  createdAt: string;
}
