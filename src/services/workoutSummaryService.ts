import api from "./api";

export interface WeeklySummaryStats {
  sessionsCompleted: number;
  exercisesLogged: number;
  totalSets: number;
  setVideosUploaded: number;
  coachVideoComments: number;
  topLifts: Array<{ exerciseName: string; e1rm: number; delta: number }>;
  totalVolumeKg: number;
  sheetsEntriesLogged: number;
  sheetsDaysActive: number;
  progressCheckIns: number;
}

export interface WorkoutWeeklySummary {
  id: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  stats: WeeklySummaryStats;
  coachNote: string | null;
  status: "draft" | "published";
  generatedAt: string;
  publishedAt: string;
  isUnread: boolean;
}

export const workoutSummaryService = {
  async listForUser(userId: string): Promise<WorkoutWeeklySummary[]> {
    const { data } = await api.get(`/admin/users/${userId}/workout-summaries`);
    return data.data ?? data;
  },

  async updateCoachNote(
    summaryId: string,
    coachNote: string | null,
  ): Promise<WorkoutWeeklySummary> {
    const { data } = await api.patch(`/admin/workout-summaries/${summaryId}`, {
      coachNote,
    });
    return data.data ?? data;
  },

  async generate(
    userId: string,
    weekStart: string,
  ): Promise<WorkoutWeeklySummary> {
    const { data } = await api.post(
      `/admin/users/${userId}/workout-summaries/generate`,
      { weekStart },
    );
    return data.data ?? data;
  },
};
