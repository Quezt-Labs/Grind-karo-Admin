export type DiscountType = "PERCENT" | "FLAT";
export type CouponScope = "ALL" | "PROGRAMS" | "COACHING_PLANS" | "SPECIFIC";

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderAmount: number | null;
  scope: CouponScope;
  applyToAddons: boolean;
  maxRedemptions: number | null;
  maxRedemptionsPerUser: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  programIds: string[];
  coachingPlanIds: string[];
  totalRedemptions: number;
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  userId: string;
  programPurchaseId: string | null;
  coachingSubscriptionId: string | null;
  discountAmount: number;
  createdAt: string;
}

export interface CreateCouponPayload {
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount?: number | null;
  minOrderAmount?: number | null;
  scope: CouponScope;
  applyToAddons?: boolean;
  maxRedemptions?: number | null;
  maxRedemptionsPerUser?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
  programIds?: string[];
  coachingPlanIds?: string[];
}

export type UpdateCouponPayload = Omit<Partial<CreateCouponPayload>, "code">;

export interface CouponsQuery {
  q?: string;
  isActive?: boolean;
  scope?: CouponScope;
}
