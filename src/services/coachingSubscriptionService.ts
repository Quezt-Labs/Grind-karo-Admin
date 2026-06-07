import api from "./api";

export type CoachingBillingAdjustmentType =
  | "EXTEND"
  | "WAIVE"
  | "MANUAL_PAYMENT";

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

export const coachingSubscriptionService = {
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
  }) {
    const { data } = await api.post(
      "/admin/coaching/subscriptions/manual-payment",
      body,
    );
    return data.data ?? data;
  },
};
