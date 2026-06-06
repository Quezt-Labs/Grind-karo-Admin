import api from "./api";

export interface FormCheckFeedbackItem {
  exerciseName: string;
  setNumber: number;
  comment: string;
  videoUrl: string | null;
  weekNumber: number | null;
  source: "sheet" | "program";
  createdAt: string;
}

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
  formCheckFeedback?: FormCheckFeedbackItem[];
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

  async generate(
    userId: string,
    weekStart: string,
    sendPush = false,
  ): Promise<WorkoutWeeklySummary> {
    const { data } = await api.post(
      `/admin/users/${userId}/workout-summaries/generate`,
      { weekStart, sendPush },
    );
    return data.data ?? data;
  },

  async resendPush(summaryId: string): Promise<{ sent: boolean }> {
    const { data } = await api.post(
      `/admin/workout-summaries/${summaryId}/resend-push`,
    );
    return data;
  },
};
