import api from "./api";
import type {
  CoachOpsBoardItem,
  CoachOpsBoardResponse,
  PatchCoachOpsEntryPayload,
} from "@/types/coachOps";

export const coachOpsService = {
  async getBoard(params?: {
    date?: string;
    coachFilter?: string;
  }): Promise<CoachOpsBoardResponse> {
    const { data } = await api.get("/coach/ops-board", { params });
    return data.data ?? data;
  },

  async patchEntry(
    athleteId: string,
    payload: PatchCoachOpsEntryPayload,
  ): Promise<CoachOpsBoardItem> {
    const { data } = await api.patch(`/coach/ops-board/${athleteId}`, payload);
    return data.data ?? data;
  },
};
