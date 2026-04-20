import api from "./api";
import type {
  Coupon,
  CouponRedemption,
  CreateCouponPayload,
  UpdateCouponPayload,
  CouponsQuery,
} from "@/types/coupon";

export const couponService = {
  /* ── CRUD ── */

  async getAll(params?: CouponsQuery): Promise<Coupon[]> {
    const { data } = await api.get("/admin/coupons", { params });
    return data.data ?? data;
  },

  async getById(id: string): Promise<Coupon> {
    const { data } = await api.get(`/admin/coupons/${id}`);
    return data.data ?? data;
  },

  async create(payload: CreateCouponPayload): Promise<Coupon> {
    const { data } = await api.post("/admin/coupons", payload);
    return data.data ?? data;
  },

  async update(id: string, payload: UpdateCouponPayload): Promise<Coupon> {
    const { data } = await api.patch(`/admin/coupons/${id}`, payload);
    return data.data ?? data;
  },

  async remove(id: string, hard = false): Promise<void> {
    await api.delete(`/admin/coupons/${id}`, {
      params: hard ? { hard: true } : undefined,
    });
  },

  /* ── Redemptions ── */

  async getRedemptions(id: string): Promise<CouponRedemption[]> {
    const { data } = await api.get(`/admin/coupons/${id}/redemptions`);
    return data.data ?? data;
  },

  /* ── SPECIFIC-scope whitelist ── */

  async linkProgram(couponId: string, programId: string): Promise<void> {
    await api.post(`/admin/coupons/${couponId}/programs`, { programId });
  },

  async unlinkProgram(couponId: string, programId: string): Promise<void> {
    await api.delete(`/admin/coupons/${couponId}/programs/${programId}`);
  },

  async linkCoachingPlan(couponId: string, planId: string): Promise<void> {
    await api.post(`/admin/coupons/${couponId}/coaching-plans`, { planId });
  },

  async unlinkCoachingPlan(couponId: string, planId: string): Promise<void> {
    await api.delete(`/admin/coupons/${couponId}/coaching-plans/${planId}`);
  },
};
