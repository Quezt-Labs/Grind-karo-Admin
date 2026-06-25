import api from "./api";
import type {
  MovementSelectionForm,
  AdminMovementSelectionPatch,
} from "@/types/programs";

export const movementSelectionService = {
  async getForm(
    programId: string,
    userId?: string,
  ): Promise<MovementSelectionForm> {
    const params = userId ? { userId } : undefined;
    const { data } = await api.get(
      `/admin/programs/${programId}/movement-selection`,
      { params },
    );
    return (data as { data?: MovementSelectionForm }).data ?? data;
  },

  async patchSelections(
    userId: string,
    programId: string,
    payload: AdminMovementSelectionPatch,
  ) {
    const { data } = await api.patch(
      `/admin/users/${userId}/programs/${programId}/movement-selection`,
      payload,
    );
    return data.data ?? data;
  },

  async syncSlotOptions(
    programId: string,
    slotId: string,
    exerciseIds?: string[],
  ): Promise<{ created: number; skipped: number }> {
    const { data } = await api.post(
      `/admin/programs/${programId}/movement-slots/${slotId}/sync-options`,
      exerciseIds?.length ? { exerciseIds } : {},
    );
    return data.data ?? data;
  },

  async bootstrapDefaults(
    programId: string,
  ): Promise<{ created: number; skipped: number }> {
    const { data } = await api.post(
      `/admin/programs/${programId}/movement-selection/bootstrap`,
    );
    return data.data ?? data;
  },
};
