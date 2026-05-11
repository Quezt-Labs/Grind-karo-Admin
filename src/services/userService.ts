import api from "./api";
import type {
  AdminUser,
  Purchaser,
  PaginatedResponse,
  UserPurchasesResponse,
  UserProgressResponse,
} from "@/types/user";

export interface UserFilters {
  q?: string;
  role?: "USER" | "ADMIN";
  limit?: number;
  offset?: number;
}

export interface PurchaserFilters {
  q?: string;
  limit?: number;
  offset?: number;
}

export const userService = {
  async getAll(filters?: UserFilters): Promise<PaginatedResponse<AdminUser>> {
    const { data } = await api.get("/admin/users", { params: filters });
    return data;
  },

  async getPurchasers(
    filters?: PurchaserFilters,
  ): Promise<PaginatedResponse<Purchaser>> {
    const { data } = await api.get("/admin/users/purchasers", {
      params: filters,
    });
    return data;
  },

  async getById(id: string): Promise<AdminUser> {
    const { data } = await api.get(`/admin/users/${id}`);
    return data;
  },

  async getPurchases(id: string): Promise<UserPurchasesResponse> {
    const { data } = await api.get(`/admin/users/${id}/purchases`);
    return data;
  },

  async getProgress(
    id: string,
    params?: { limit?: number; offset?: number },
  ): Promise<UserProgressResponse> {
    const { data } = await api.get(`/admin/progress/${id}`, { params });
    return data.data ?? data;
  },
};
