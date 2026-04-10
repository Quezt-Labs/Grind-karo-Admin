import api from "./api";
import type { Enrollment } from "@/types/program";

export const enrollmentService = {
  async getMyEnrollments(): Promise<Enrollment[]> {
    const { data } = await api.get("/programs/my/enrollments");
    return data.data ?? data;
  },

  async getMyActiveEnrollments(): Promise<Enrollment[]> {
    const { data } = await api.get("/programs/my/active");
    return data.data ?? data;
  },

  async checkAccess(programId: string): Promise<{ hasAccess: boolean }> {
    const { data } = await api.get(`/programs/${programId}/access`);
    return data;
  },
};
