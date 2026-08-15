import api from "./api";

export type PaymentKind = "coaching" | "program" | "book" | "addon";

export interface AdminPaymentRow {
  kind: PaymentKind;
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  productName: string;
  amount: number;
  currency: string;
  status: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
  stuckReason?: string;
}

export interface ReconciliationRun {
  id: string;
  scope: "purchase" | "coaching";
  triggeredBy: string;
  adminId: string | null;
  report: Record<string, unknown>;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  createdAt: string;
}

export const paymentService = {
  async listStuck(params?: {
    kind?: PaymentKind | "all";
    minAgeMinutes?: number;
    limit?: number;
    offset?: number;
  }) {
    const { data } = await api.get("/admin/payments/stuck", { params });
    const payload = data.data ?? data;
    return payload as {
      minAgeMinutes: number;
      checkoutGraceMinutes: number;
      total: number;
      items: AdminPaymentRow[];
    };
  },

  async search(params: {
    q: string;
    kind?: PaymentKind | "all";
    limit?: number;
    offset?: number;
  }) {
    const { data } = await api.get("/admin/payments/search", { params });
    const payload = data.data ?? data;
    return payload as {
      query: string;
      total: number;
      items: AdminPaymentRow[];
    };
  },

  async runPurchaseReconcile() {
    const { data } = await api.post("/admin/purchases/reconcile");
    return data.data ?? data;
  },

  async runCoachingReconcile() {
    const { data } = await api.post("/admin/coaching/subscriptions/reconcile");
    return data.data ?? data;
  },

  async listPurchaseReconcileHistory(params?: {
    limit?: number;
    offset?: number;
  }) {
    const { data } = await api.get("/admin/payments/reconcile/history", {
      params,
    });
    return (data.data ?? data) as ReconciliationRun[];
  },

  async listCoachingReconcileHistory(params?: {
    limit?: number;
    offset?: number;
  }) {
    const { data } = await api.get(
      "/admin/coaching/subscriptions/reconcile/history",
      { params },
    );
    return (data.data ?? data) as ReconciliationRun[];
  },
};
