import api from "./api";
import type { SheetExerciseContext } from "@/components/shared/FormCheckSheetContext";

export interface AdminSheetsSetVideo {
  id: string;
  tabName: string;
  weekNumber: number;
  dayNumber: number;
  sortOrder: number;
  setNumber: number;
  exerciseName: string;
  videoUrl: string;
  createdAt: string;
  coachComment?: string | null;
  coachCommentId?: string | null;
  coachCommentUpdatedAt?: string | null;
  athleteNotes?: string | null;
  sheetContext?: SheetExerciseContext | null;
}

export interface AdminSheetTabData {
  exercises: Array<{
    weekNumber: number;
    dayNumber: number;
    dayFocus?: string;
    category: string;
    exerciseName: string;
    goalRpe: string;
    sets: number | null;
    repScheme: string;
    loadKg: string;
    sortOrder: number;
    actualLoad?: string;
    actualRpe?: string;
  }>;
  rawRows?: string[][];
}

export interface AdminSheetsExerciseNote {
  id: string;
  tabName: string;
  weekNumber: number;
  dayNumber: number;
  exerciseName: string;
  category: string;
  notes: string;
  completed: boolean;
  updatedAt: string;
}

export interface UpsertSheetsVideoCommentPayload {
  sheetsSetVideoId: string;
  comment: string;
}

export const sheetsSetVideoService = {
  async listForUser(
    userId: string,
    weekNumber?: number,
  ): Promise<AdminSheetsSetVideo[]> {
    const params =
      weekNumber != null ? { weekNumber: String(weekNumber) } : undefined;
    const { data } = await api.get(`/sheets/admin/users/${userId}/set-videos`, {
      params,
    });
    return data.data ?? data;
  },

  async listSheetWeeks(userId: string): Promise<number[]> {
    const { data } = await api.get(`/sheets/admin/users/${userId}/sheet-weeks`);
    return data.data ?? data;
  },

  async getUserProgram(
    userId: string,
  ): Promise<Record<string, AdminSheetTabData>> {
    const { data } = await api.get(`/sheets/admin/users/${userId}/program`);
    return data.data ?? data;
  },
};

export const sheetsExerciseNotesService = {
  async listForUser(
    userId: string,
    weekNumber?: number,
  ): Promise<AdminSheetsExerciseNote[]> {
    const params =
      weekNumber != null ? { weekNumber: String(weekNumber) } : undefined;
    const { data } = await api.get(
      `/sheets/admin/users/${userId}/exercise-notes`,
      { params },
    );
    return data.data ?? data;
  },
};

export const sheetsSetVideoCommentService = {
  async upsert(payload: UpsertSheetsVideoCommentPayload) {
    const { data } = await api.post(
      "/admin/sheets-set-video-comments",
      payload,
    );
    return data.data ?? data;
  },

  async remove(commentId: string): Promise<void> {
    await api.delete(`/admin/sheets-set-video-comments/${commentId}`);
  },
};
