import api from "./api";

export interface FormCheckInboxItem {
  id: string;
  source: "sheet" | "program";
  userId: string;
  userName: string | null;
  userEmail: string;
  tabName: string | null;
  weekNumber: number | null;
  dayNumber: number | null;
  setNumber: number;
  exerciseName: string;
  videoUrl: string;
  createdAt: string;
  coachComment: string | null;
  coachCommentId: string | null;
  reviewed: boolean;
  athleteNotes?: string | null;
  exerciseLogId?: string;
  programId?: string;
  workoutLogId?: string;
  programName?: string | null;
}

export interface FormCheckInboxResponse {
  total: number;
  pendingCount: number;
  limit: number;
  offset: number;
  items: FormCheckInboxItem[];
}

export interface FormCheckInboxAthlete {
  userId: string;
  userName: string | null;
  userEmail: string;
  totalCount: number;
  pendingCount: number;
  latestVideoAt: string | null;
}

export interface FormCheckInboxAthletesByPlan {
  mega: FormCheckInboxAthlete[];
  ultra: FormCheckInboxAthlete[];
}

export const formCheckInboxService = {
  async list(params?: {
    uncommentedOnly?: boolean;
    weekNumber?: number;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<FormCheckInboxResponse> {
    const { data } = await api.get("/admin/form-check-videos", { params });
    return data.data ?? data;
  },

  async pendingCount(): Promise<{ pendingCount: number }> {
    const { data } = await api.get("/admin/form-check-videos/pending-count");
    return data.data ?? data;
  },

  async listAthletes(params?: {
    uncommentedOnly?: boolean;
  }): Promise<FormCheckInboxAthletesByPlan> {
    const { data } = await api.get("/admin/form-check-videos/athletes", {
      params,
    });
    return data.data ?? data;
  },
};
