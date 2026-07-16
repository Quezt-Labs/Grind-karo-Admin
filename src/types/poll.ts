import type { CouponScope, DiscountType } from "./coupon";

export type PollStatus = "DRAFT" | "OPEN" | "CLOSED" | "RESOLVED";

export interface PollOption {
  id: string;
  label: string;
  subtitle: string | null;
  imageUrl: string | null;
  sortOrder: number;
  voteCount: number;
}

export interface Poll {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  status: PollStatus;
  closesAt: string;
  resolvedAt: string | null;
  winningOptionId: string | null;
  participationDiscountType: DiscountType;
  participationDiscountValue: number;
  participationMaxDiscount: number | null;
  participationScope: CouponScope;
  participationExpiresAt: string | null;
  winnerDiscountType: DiscountType;
  winnerDiscountValue: number;
  winnerMaxDiscount: number | null;
  winnerScope: CouponScope;
  winnerExpiresAt: string | null;
  bindRewardsToVoter: boolean;
  revealCodesAfterClose: boolean;
  heroEyebrow: string | null;
  heroHeadline: string | null;
  ctaLabel: string | null;
  heroImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  totalVotes: number;
  options: PollOption[];
  rewardCounts: {
    participation: number;
    winner: number;
  };
}

export interface PollOptionInput {
  id?: string;
  label: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
}

export interface CreatePollPayload {
  slug: string;
  title: string;
  subtitle?: string | null;
  closesAt: string;
  participationDiscountType?: DiscountType;
  participationDiscountValue: number;
  participationMaxDiscount?: number | null;
  participationScope?: CouponScope;
  participationExpiresAt?: string | null;
  winnerDiscountType?: DiscountType;
  winnerDiscountValue: number;
  winnerMaxDiscount?: number | null;
  winnerScope?: CouponScope;
  winnerExpiresAt?: string | null;
  bindRewardsToVoter?: boolean;
  revealCodesAfterClose?: boolean;
  heroEyebrow?: string | null;
  heroHeadline?: string | null;
  ctaLabel?: string | null;
  heroImageUrl?: string | null;
  options: PollOptionInput[];
}

export type UpdatePollPayload = Omit<Partial<CreatePollPayload>, "slug"> & {
  options?: PollOptionInput[];
};
