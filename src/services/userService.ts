import api from "./api";
import type {
  AdminUser,
  Purchaser,
  PaginatedResponse,
  UserPurchasesResponse,
  UserProgressResponse,
  UserProgressEntry,
} from "@/types/user";
import type { AdminWorkoutLogsResponse } from "@/types/workoutLogs";

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
    const raw = data.data ?? data;
    if (Array.isArray(raw)) {
      return {
        total: raw.length,
        limit: params?.limit ?? 50,
        offset: params?.offset ?? 0,
        items: raw as UserProgressEntry[],
      };
    }
    return raw;
  },

  async patchSpreadsheetId(
    userId: string,
    spreadsheetId: string | null,
  ): Promise<{ success: true; spreadsheetId: string | null }> {
    const { data } = await api.patch(`/admin/users/${userId}/spreadsheet-id`, {
      spreadsheetId,
    });
    return data;
  },

  async patchWorkoutSetVideos(
    userId: string,
    enabled: boolean,
  ): Promise<{ success: true; workoutSetVideosEnabled: boolean }> {
    const { data } = await api.patch(
      `/admin/users/${userId}/workout-set-videos`,
      { enabled },
    );
    return data;
  },

  async getWorkoutLogs(
    userId: string,
    params?: { programId?: string; limit?: number; offset?: number },
  ): Promise<AdminWorkoutLogsResponse> {
    const { data } = await api.get(`/admin/users/${userId}/workout-logs`, {
      params,
    });
    return data;
  },
};
