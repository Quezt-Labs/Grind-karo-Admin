import api from "./api";

export type TrackerGuidanceKind = "nutrition" | "warmup";
type TrackerGuidanceCanonicalType = "NUTRITION" | "WARMUP";
const PAYLOAD_FALLBACK_STATUS = new Set([400, 422]);

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

function normalizeSortOrder(item: Record<string, unknown>): number {
  const raw =
    (item.sortOrder as number | string | undefined) ??
    (item.sort_order as number | string | undefined) ??
    (item.order as number | string | undefined) ??
    (item.displayOrder as number | string | undefined) ??
    (item.display_order as number | string | undefined);
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toCanonicalType(kind: TrackerGuidanceKind): TrackerGuidanceCanonicalType {
  return kind === "nutrition" ? "NUTRITION" : "WARMUP";
}

type TrackerGuidanceMutationPayload = {
  kind: TrackerGuidanceKind;
  title: string;
  body: string;
  sortOrder?: number;
  programId?: string;
};

type TrackerGuidanceUpdatePayload = Partial<{
  kind: TrackerGuidanceKind;
  title: string;
  body: string;
  sortOrder: number;
  programId: string | null;
}>;

function mapCreateCanonicalPayload(payload: TrackerGuidanceMutationPayload): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    type: toCanonicalType(payload.kind),
    title: payload.title,
    content: payload.body,
    order: payload.sortOrder ?? 0,
  };
  if (payload.programId !== undefined) mapped.programId = payload.programId;
  return mapped;
}

function mapCreateLegacyPayload(payload: TrackerGuidanceMutationPayload): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    kind: payload.kind,
    title: payload.title,
    body: payload.body,
    sortOrder: payload.sortOrder ?? 0,
  };
  if (payload.programId !== undefined) mapped.programId = payload.programId;
  return mapped;
}

function mapUpdateCanonicalPayload(payload: TrackerGuidanceUpdatePayload): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  if (payload.kind !== undefined) mapped.type = toCanonicalType(payload.kind);
  if (payload.title !== undefined) mapped.title = payload.title;
  if (payload.body !== undefined) mapped.content = payload.body;
  if (payload.sortOrder !== undefined) mapped.order = payload.sortOrder;
  if (payload.programId !== undefined) mapped.programId = payload.programId;
  return mapped;
}

function mapUpdateLegacyPayload(payload: TrackerGuidanceUpdatePayload): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  if (payload.kind !== undefined) mapped.kind = payload.kind;
  if (payload.title !== undefined) mapped.title = payload.title;
  if (payload.body !== undefined) mapped.body = payload.body;
  if (payload.sortOrder !== undefined) mapped.sortOrder = payload.sortOrder;
  if (payload.programId !== undefined) mapped.programId = payload.programId;
  return mapped;
}

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

function isPayloadFallbackStatus(status: number): boolean {
  return PAYLOAD_FALLBACK_STATUS.has(status);
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
    sortOrder: normalizeSortOrder(item),
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
    payload: TrackerGuidanceMutationPayload,
  ): Promise<TrackerGuidanceItem> {
    const endpoint = `/admin/trackers/${userId}/guidance`;
    const canonicalPayload = mapCreateCanonicalPayload(payload);
    const legacyPayload = mapCreateLegacyPayload(payload);
    const run = (body: Record<string, unknown>) =>
      api.post(endpoint, body, {
        validateStatus: (status) =>
          isSuccessStatus(status) || isPayloadFallbackStatus(status),
      });

    const response = await run(canonicalPayload);
    if (isSuccessStatus(response.status)) {
      return normalizeItem(
        (response.data.data ?? response.data) as TrackerGuidanceItem &
          Record<string, unknown>,
      );
    }

    if (isPayloadFallbackStatus(response.status)) {
      const fallback = await run(legacyPayload);
      if (isSuccessStatus(fallback.status)) {
        return normalizeItem(
          (fallback.data.data ?? fallback.data) as TrackerGuidanceItem &
            Record<string, unknown>,
        );
      }
      await api.post(endpoint, legacyPayload);
    }

    await api.post(endpoint, canonicalPayload);
    throw new Error("Failed to create tracker guidance.");
  },

  async update(
    userId: string,
    guidanceId: string,
    payload: TrackerGuidanceUpdatePayload,
  ): Promise<TrackerGuidanceItem> {
    const endpoint = `/admin/trackers/${userId}/guidance/${guidanceId}`;
    const canonicalPayload = mapUpdateCanonicalPayload(payload);
    const legacyPayload = mapUpdateLegacyPayload(payload);
    const run = (body: Record<string, unknown>) =>
      api.patch(endpoint, body, {
        validateStatus: (status) =>
          isSuccessStatus(status) || isPayloadFallbackStatus(status),
      });

    const response = await run(canonicalPayload);
    if (isSuccessStatus(response.status)) {
      return normalizeItem(
        (response.data.data ?? response.data) as TrackerGuidanceItem &
          Record<string, unknown>,
      );
    }

    if (isPayloadFallbackStatus(response.status)) {
      const fallback = await run(legacyPayload);
      if (isSuccessStatus(fallback.status)) {
        return normalizeItem(
          (fallback.data.data ?? fallback.data) as TrackerGuidanceItem &
            Record<string, unknown>,
        );
      }
      await api.patch(endpoint, legacyPayload);
    }

    await api.patch(endpoint, canonicalPayload);
    throw new Error("Failed to update tracker guidance.");
  },

  async remove(userId: string, guidanceId: string): Promise<void> {
    await api.delete(`/admin/trackers/${userId}/guidance/${guidanceId}`);
  },
};
