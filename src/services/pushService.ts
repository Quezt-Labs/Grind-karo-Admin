import api from "./api";
import type {
  AdminSendTestPushResponse,
  AdminUserPushStatus,
} from "@/types/push";

export const pushService = {
  async getUserStatus(userId: string): Promise<AdminUserPushStatus> {
    const { data } = await api.get(`/admin/push/users/${userId}`);
    return data.data ?? data;
  },

  async sendTest(
    userId: string,
    body?: string,
  ): Promise<AdminSendTestPushResponse> {
    const { data } = await api.post(`/admin/push/users/${userId}/test`, {
      body,
    });
    return data.data ?? data;
  },
};
