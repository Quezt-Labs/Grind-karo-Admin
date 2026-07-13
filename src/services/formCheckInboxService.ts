import api from "./api";

const PROGRAM_SOURCE = "program" as const;

export interface FormCheckInboxItem {
  id: string;
  source: "program";
  userId: string;
  userName: string | null;
  userEmail: string;
  tabName: string | null;
  weekNumber: number | null;
  dayNumber: number | null;
  sortOrder?: number | null;
  setNumber: number;
  exerciseName: string;
  videoUrl: string;
  createdAt: string;
  coachComment: string | null;
  coachCommentId: string | null;
  coachCommentUpdatedAt?: string | null;
  athleteReply?: string | null;
  athleteRepliedAt?: string | null;
  reviewed: boolean;
  exerciseNotes?: string | null;
  setNotes?: string | null;
  /** @deprecated use exerciseNotes + setNotes */
  athleteNotes?: string | null;
  exerciseLogId?: string;
  programExerciseId?: string | null;
  programId?: string;
  workoutLogId?: string;
  programName?: string | null;
  exerciseCategory?: string | null;
  dayLabel?: string | null;
  prescriptionSets?: number | null;
  repScheme?: string | null;
  actualSets?: number | null;
  actualReps?: number | null;
  actualLoad?: number | null;
  actualRpe?: number | null;
  targetRpe?: string | null;
  prescribedLoadKg?: number | null;
  percentOneRm?: number | null;
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
  formCheckHandler: "assistant_coach" | "admin";
  formCheckCoachId: string | null;
  formCheckCoachName: string | null;
}

export interface FormCheckInboxAthletesByPlan {
  mega: FormCheckInboxAthlete[];
  ultra: FormCheckInboxAthlete[];
}

export interface FormCheckMissingAthlete {
  userId: string;
  userName: string | null;
  userEmail: string;
  planSlug: "mega" | "ultra";
  planName: string;
  subscriptionWeek: number;
  blockStartWeek: number;
  blockEndWeek: number;
  uploadsThisWeek: number;
  coachingSubscriptionId: string;
  formCheckHandler: "assistant_coach" | "admin";
  formCheckCoachId: string | null;
  formCheckCoachName: string | null;
}

export interface FormCheckMissingResponse {
  total: number;
  mega: FormCheckMissingAthlete[];
  ultra: FormCheckMissingAthlete[];
}

function normalizeInboxItem(
  item: FormCheckInboxItem & Record<string, unknown>,
): FormCheckInboxItem {
  const coachComment =
    (item.coachComment as string | null | undefined) ??
    (item.coach_comment as string | null | undefined) ??
    null;
  return {
    ...item,
    source: "program",
    coachComment,
    coachCommentId:
      (item.coachCommentId as string | null | undefined) ??
      (item.coach_comment_id as string | null | undefined) ??
      null,
    coachCommentUpdatedAt:
      (item.coachCommentUpdatedAt as string | null | undefined) ??
      (item.coach_comment_updated_at as string | null | undefined) ??
      null,
    athleteReply:
      (item.athleteReply as string | null | undefined) ??
      (item.athlete_reply as string | null | undefined) ??
      null,
    athleteRepliedAt:
      (item.athleteRepliedAt as string | null | undefined) ??
      (item.athlete_replied_at as string | null | undefined) ??
      null,
    reviewed: Boolean(coachComment?.trim()),
  };
}

export const formCheckInboxService = {
  async list(params?: {
    uncommentedOnly?: boolean;
    commentedOnly?: boolean;
    weekNumber?: number;
    dayNumber?: number;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<FormCheckInboxResponse> {
    const { data } = await api.get("/admin/form-check-videos", {
      params: { ...params, source: PROGRAM_SOURCE },
      timeout: 60_000,
    });
    const response = data.data ?? data;
    // Server totals are program-scoped when source=program; keep filter as safety.
    const items = (response.items ?? [])
      .filter(
        (item: FormCheckInboxItem) =>
          item.source === "program" || item.source == null,
      )
      .map((item: FormCheckInboxItem & Record<string, unknown>) =>
        normalizeInboxItem(item),
      );
    return {
      ...response,
      total: response.total ?? items.length,
      pendingCount: response.pendingCount ?? 0,
      items,
    };
  },

  async pendingCount(): Promise<{ pendingCount: number }> {
    const { data } = await api.get("/admin/form-check-videos/pending-count", {
      params: { source: PROGRAM_SOURCE },
    });
    return data.data ?? data;
  },

  async listAthletes(params?: {
    uncommentedOnly?: boolean;
  }): Promise<FormCheckInboxAthletesByPlan> {
    const { data } = await api.get("/admin/form-check-videos/athletes", {
      params: { ...params, source: PROGRAM_SOURCE },
    });
    const payload = data.data ?? data;
    const normalize = (
      row: Partial<FormCheckInboxAthlete>,
    ): FormCheckInboxAthlete => ({
      userId: row.userId!,
      userName: row.userName ?? null,
      userEmail: row.userEmail!,
      totalCount: row.totalCount ?? 0,
      pendingCount: row.pendingCount ?? 0,
      latestVideoAt: row.latestVideoAt ?? null,
      formCheckHandler: row.formCheckHandler ?? "admin",
      formCheckCoachId: row.formCheckCoachId ?? null,
      formCheckCoachName: row.formCheckCoachName ?? null,
    });
    return {
      mega: (payload.mega ?? []).map(normalize),
      ultra: (payload.ultra ?? []).map(normalize),
    };
  },

  async listMissing(): Promise<FormCheckMissingResponse> {
    const { data } = await api.get("/admin/form-check-videos/missing");
    const payload = data.data ?? data;
    const normalize = (
      row: Partial<FormCheckMissingAthlete>,
    ): FormCheckMissingAthlete => ({
      userId: row.userId!,
      userName: row.userName ?? null,
      userEmail: row.userEmail!,
      planSlug: row.planSlug === "ultra" ? "ultra" : "mega",
      planName: row.planName ?? "",
      subscriptionWeek: row.subscriptionWeek ?? 0,
      blockStartWeek: row.blockStartWeek ?? 0,
      blockEndWeek: row.blockEndWeek ?? 0,
      uploadsThisWeek: row.uploadsThisWeek ?? 0,
      coachingSubscriptionId: row.coachingSubscriptionId ?? "",
      formCheckHandler: row.formCheckHandler ?? "admin",
      formCheckCoachId: row.formCheckCoachId ?? null,
      formCheckCoachName: row.formCheckCoachName ?? null,
    });
    return {
      total: payload.total ?? 0,
      mega: (payload.mega ?? []).map(normalize),
      ultra: (payload.ultra ?? []).map(normalize),
    };
  },
};
