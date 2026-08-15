import api from "./api";
import type { CoachingSubscription } from "@/types/program";
import type { CoachingAddonStatus } from "@/types/user";

export type CoachingBillingAdjustmentType =
  | "EXTEND"
  | "WAIVE"
  | "MANUAL_PAYMENT"
  | "DATE_CORRECTION"
  | "FEE_CORRECTION"
  | "PLAN_CHANGE";

export interface CoachingBillingAdjustment {
  id: string;
  userId: string;
  subscriptionId: string | null;
  type: CoachingBillingAdjustmentType;
  reason: string;
  amount: number | null;
  daysAdded: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  previousExpiresAt: string | null;
  newExpiresAt: string | null;
  createdByAdminId: string | null;
  createdAt: string;
}

export interface CoachingFeeOverride {
  id: string;
  userId: string;
  planId: string;
  baseAmount: number;
  reason: string | null;
  createdByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoachingRenewalRow {
  subscriptionId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  planId: string;
  planName: string;
  planSlug: string;
  startDate: string;
  expiresAt: string;
  totalAmount: number;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  daysLeft: number;
  daysOverdue: number;
}

export interface CoachingRenewalsResponse {
  expiringWithinDays: number;
  recentlyExpiredDays: number;
  graceDays: number;
  counts: {
    expiringSoon: number;
    overdueGrace: number;
    recentlyExpired: number;
  };
  expiringSoon: CoachingRenewalRow[];
  overdueGrace: CoachingRenewalRow[];
  recentlyExpired: CoachingRenewalRow[];
}

export const coachingSubscriptionService = {
  async listSubscriptions(filters?: {
    status?: string;
    userId?: string;
    planId?: string;
    paid?: boolean;
  }) {
    const { data } = await api.get("/admin/coaching/subscriptions", {
      params: filters,
    });
    return (data.data ?? data) as CoachingSubscription[];
  },

  async listRenewals(params?: {
    expiringWithinDays?: number;
    recentlyExpiredDays?: number;
  }): Promise<CoachingRenewalsResponse> {
    const { data } = await api.get("/admin/coaching/subscriptions/renewals", {
      params,
    });
    return data.data ?? data;
  },

  async listFeeOverrides(userId: string): Promise<CoachingFeeOverride[]> {
    const { data } = await api.get(
      `/admin/coaching/subscriptions/users/${userId}/fee-overrides`,
    );
    return data.data ?? data;
  },

  async setFeeOverride(
    userId: string,
    body: { planId: string; baseAmount: number; reason?: string },
  ): Promise<CoachingFeeOverride> {
    const { data } = await api.put(
      `/admin/coaching/subscriptions/users/${userId}/fee-overrides`,
      body,
    );
    return data.data ?? data;
  },

  async clearFeeOverride(
    userId: string,
    planId: string,
  ): Promise<{ success: true }> {
    const { data } = await api.delete(
      `/admin/coaching/subscriptions/users/${userId}/fee-overrides/${planId}`,
    );
    return data.data ?? data;
  },

  async listAdjustments(params?: {
    userId?: string;
    subscriptionId?: string;
  }): Promise<CoachingBillingAdjustment[]> {
    const { data } = await api.get(
      "/admin/coaching/subscriptions/adjustments",
      {
        params,
      },
    );
    return data.data ?? data;
  },

  async deleteAdjustment(adjustmentId: string): Promise<{ success: true }> {
    const { data } = await api.delete(
      `/admin/coaching/subscriptions/adjustments/${adjustmentId}`,
    );
    return data.data ?? data;
  },

  async listUserAddons(userId: string): Promise<CoachingAddonStatus[]> {
    const { data } = await api.get(
      `/admin/coaching/subscriptions/users/${userId}/addons`,
    );
    const payload = data.data ?? data;
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.addons)
          ? payload.addons
          : [];
    return rows.map((row: Record<string, unknown>) => ({
      ...(() => {
        const rawState = (
          (row.state as string | undefined) ??
          (row.status as string | undefined) ??
          "inactive"
        ).toLowerCase();
        const state: CoachingAddonStatus["state"] =
          rawState === "active"
            ? "active"
            : rawState === "purchased"
              ? "purchased"
              : rawState === "expired"
                ? "expired"
                : "inactive";
        return { state };
      })(),
      addonId:
        (row.addonId as string | null | undefined) ??
        (row.addon_id as string | null | undefined) ??
        null,
      slug:
        (row.slug as string | null | undefined) ??
        (row.addonSlug as string | null | undefined) ??
        (row.addon_slug as string | null | undefined) ??
        null,
      name:
        (row.name as string | undefined) ??
        (row.addonName as string | undefined) ??
        (row.addon_name as string | undefined) ??
        "Addon",
      price:
        (row.price as number | null | undefined) ??
        (row.pricePaid as number | null | undefined) ??
        (row.price_paid as number | null | undefined) ??
        null,
      planName:
        (row.planName as string | null | undefined) ??
        (row.plan_name as string | null | undefined) ??
        null,
      sourcePlanName:
        (row.sourcePlanName as string | null | undefined) ??
        (row.source_plan_name as string | null | undefined) ??
        null,
      expiresAt:
        (row.expiresAt as string | null | undefined) ??
        (row.expires_at as string | null | undefined) ??
        null,
    }));
  },

  async removeIncorrectPayment(
    subscriptionId: string,
    reason: string,
  ): Promise<{ success: true }> {
    const { data } = await api.post(
      `/admin/coaching/subscriptions/${subscriptionId}/remove-incorrect-payment`,
      { reason },
    );
    return data.data ?? data;
  },

  async extendSubscription(
    subscriptionId: string,
    body: { days?: number; expiresAt?: string; reason: string },
  ) {
    const { data } = await api.post(
      `/admin/coaching/subscriptions/${subscriptionId}/extend`,
      body,
    );
    return data.data ?? data;
  },

  async waivePeriod(
    subscriptionId: string,
    body: { reason: string; extendDays?: number },
  ) {
    const { data } = await api.post(
      `/admin/coaching/subscriptions/${subscriptionId}/waive`,
      body,
    );
    return data.data ?? data;
  },

  async recordManualPayment(body: {
    userId: string;
    planId: string;
    totalAmount?: number;
    reason: string;
    feeCoversMonths?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    startDate?: string;
    expiresAt?: string;
  }) {
    const { data } = await api.post(
      "/admin/coaching/subscriptions/manual-payment",
      body,
    );
    return data.data ?? data;
  },

  async patchSubscriptionFee(
    subscriptionId: string,
    body: {
      totalAmount: number;
      reason: string;
    },
  ) {
    const { data } = await api.patch(
      `/admin/coaching/subscriptions/${subscriptionId}/fee`,
      body,
    );
    return data.data ?? data;
  },

  async patchSubscriptionDates(
    subscriptionId: string,
    body: {
      startDate?: string;
      expiresAt?: string;
      reason: string;
    },
  ) {
    const { data } = await api.patch(
      `/admin/coaching/subscriptions/${subscriptionId}/dates`,
      body,
    );
    return data.data ?? data;
  },

  async setPrimarySubscription(
    userId: string,
    subscriptionId: string | null,
  ): Promise<{ success: true; primaryCoachingSubscriptionId: string | null }> {
    const { data } = await api.patch(
      `/admin/coaching/subscriptions/users/${userId}/primary`,
      { subscriptionId },
    );
    return data.data ?? data;
  },

  async refundSubscription(subscriptionId: string, reason?: string) {
    const { data } = await api.post(
      `/admin/coaching/subscriptions/${subscriptionId}/refund`,
      { reason },
    );
    return data.data ?? data;
  },

  async cancelSubscription(subscriptionId: string) {
    const { data } = await api.post(
      `/admin/coaching/subscriptions/${subscriptionId}/cancel`,
    );
    return data.data ?? data;
  },

  async switchPlan(
    subscriptionId: string,
    body: {
      targetPlanId: string;
      totalAmount?: number;
      reason: string;
    },
  ) {
    const { data } = await api.post(
      `/admin/coaching/subscriptions/${subscriptionId}/switch-plan`,
      body,
    );
    return data.data ?? data;
  },

  async deleteSubscription(subscriptionId: string) {
    const { data } = await api.delete(
      `/admin/coaching/subscriptions/${subscriptionId}`,
    );
    return data.data ?? data;
  },
};
