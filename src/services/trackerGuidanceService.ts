import api from "./api";

export type TrackerGuidanceKind = "nutrition" | "warmup";

export interface TrackerGuidanceItem {
  id: string;
  userId: string;
  kind: TrackerGuidanceKind;
  title: string;
  body: string;
  sortOrder: number;
  programId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function normalizeKind(value: string | undefined): TrackerGuidanceKind {
  return value?.toLowerCase().includes("nutrition") ? "nutrition" : "warmup";
}

function normalizeItem(
  item: TrackerGuidanceItem & Record<string, unknown>,
): TrackerGuidanceItem {
  return {
    id: (item.id as string | undefined) ?? "",
    userId:
      (item.userId as string | undefined) ??
      (item.user_id as string | undefined) ??
      "",
    kind: normalizeKind(
      (item.kind as string | undefined) ??
        (item.type as string | undefined) ??
        (item.category as string | undefined),
    ),
    title:
      (item.title as string | undefined) ??
      (item.heading as string | undefined) ??
      "Guidance",
    body:
      (item.body as string | undefined) ??
      (item.content as string | undefined) ??
      (item.guidance as string | undefined) ??
      "",
    sortOrder:
      (item.sortOrder as number | undefined) ??
      (item.sort_order as number | undefined) ??
      0,
    programId:
      (item.programId as string | null | undefined) ??
      (item.program_id as string | null | undefined) ??
      null,
    createdAt:
      (item.createdAt as string | undefined) ??
      (item.created_at as string | undefined),
    updatedAt:
      (item.updatedAt as string | undefined) ??
      (item.updated_at as string | undefined),
  };
}

export const trackerGuidanceService = {
  async list(userId: string): Promise<TrackerGuidanceItem[]> {
    const { data } = await api.get(`/admin/trackers/${userId}/guidance`);
    const payload = data.data ?? data;
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : [];
    return rows.map((row: TrackerGuidanceItem & Record<string, unknown>) =>
      normalizeItem(row),
    );
  },

  async create(
    userId: string,
    payload: {
      kind: TrackerGuidanceKind;
      title: string;
      body: string;
      sortOrder?: number;
      programId?: string;
    },
  ): Promise<TrackerGuidanceItem> {
    const { data } = await api.post(`/admin/trackers/${userId}/guidance`, payload);
    return normalizeItem(
      (data.data ?? data) as TrackerGuidanceItem & Record<string, unknown>,
    );
  },

  async update(
    userId: string,
    guidanceId: string,
    payload: Partial<{
      kind: TrackerGuidanceKind;
      title: string;
      body: string;
      sortOrder: number;
      programId: string | null;
    }>,
  ): Promise<TrackerGuidanceItem> {
    const { data } = await api.patch(
      `/admin/trackers/${userId}/guidance/${guidanceId}`,
      payload,
    );
    return normalizeItem(
      (data.data ?? data) as TrackerGuidanceItem & Record<string, unknown>,
    );
  },

  async remove(userId: string, guidanceId: string): Promise<void> {
    await api.delete(`/admin/trackers/${userId}/guidance/${guidanceId}`);
  },
};
