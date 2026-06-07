import api from "./api";
import type {
  AssistantCoach,
  AthleteAssignment,
  AssignedAthletesResponse,
  CoachAthleteSummaryResponse,
  UpsertAthleteAssignmentPayload,
} from "@/types/athleteAssignment";
import type { CoachRevenueOverviewResponse } from "@/types/coachDashboard";
import type { AdminWorkoutLogsResponse } from "@/types/workoutLogs";

export const athleteAssignmentService = {
  async getByAthleteId(athleteId: string): Promise<AthleteAssignment | null> {
    const { data } = await api.get(`/admin/athlete-assignments/${athleteId}`);
    return data;
  },

  async upsert(
    athleteId: string,
    payload: UpsertAthleteAssignmentPayload,
  ): Promise<AthleteAssignment> {
    const { data } = await api.put(
      `/admin/athlete-assignments/${athleteId}`,
      payload,
    );
    return data;
  },

  async listAssignedAthletes(): Promise<AssignedAthletesResponse> {
    const { data } = await api.get("/coach/assigned-athletes");
    return data;
  },

  async getCoachAthletePurchases(athleteId: string) {
    const { data } = await api.get(`/coach/athletes/${athleteId}/purchases`);
    return data;
  },

  async getCoachAthleteWorkoutLogs(
    athleteId: string,
    params?: { programId?: string; limit?: number; offset?: number },
  ): Promise<AdminWorkoutLogsResponse> {
    const { data } = await api.get(
      `/coach/athletes/${athleteId}/workout-logs`,
      {
        params,
      },
    );
    return data;
  },

  async getCoachAthleteSummary(
    athleteId: string,
  ): Promise<CoachAthleteSummaryResponse> {
    const { data } = await api.get(`/coach/athletes/${athleteId}`);
    return data;
  },

  async getRevenueOverview(): Promise<CoachRevenueOverviewResponse> {
    const { data } = await api.get("/coach/revenue-overview");
    return data.data ?? data;
  },
};

export const assistantCoachService = {
  async list(): Promise<AssistantCoach[]> {
    const { data } = await api.get("/admin/assistant-coaches");
    return data;
  },

  async create(payload: {
    email: string;
    password: string;
    name?: string;
  }): Promise<{ id: string; email: string; role: string; created: boolean }> {
    const { data } = await api.post("/admin/assistant-coaches", payload);
    return data;
  },

  async update(
    id: string,
    payload: { name?: string; password?: string },
  ): Promise<AssistantCoach> {
    const { data } = await api.patch(`/admin/assistant-coaches/${id}`, payload);
    return data;
  },
};
