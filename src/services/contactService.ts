import api from "./api";
import type {
  ContactSubmission,
  ContactSubmissionsResponse,
  ContactSubmissionsQuery,
} from "@/types/contact";

export const contactService = {
  async getAll(
    params?: ContactSubmissionsQuery,
  ): Promise<ContactSubmissionsResponse> {
    const { data } = await api.get("/admin/contact-submissions", { params });
    return data.data ?? data;
  },

  async getById(id: string): Promise<ContactSubmission> {
    const { data } = await api.get(`/admin/contact-submissions/${id}`);
    return data.data ?? data;
  },

  async markRead(id: string): Promise<ContactSubmission> {
    const { data } = await api.post(`/admin/contact-submissions/${id}/read`);
    return data.data ?? data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/contact-submissions/${id}`);
  },
};
