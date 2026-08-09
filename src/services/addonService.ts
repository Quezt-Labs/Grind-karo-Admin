import api from "./api";
import axios from "axios";
import type {
  CoachingAddon,
  CreateCoachingAddonPayload,
  UpdateCoachingAddonPayload,
} from "@/types/program";

export interface AddonUsageCounts {
  addonId: string;
  activeUsers: number | null;
  totalUsers: number | null;
  purchasedUsers: number | null;
  expiredUsers: number | null;
  inactiveUsers: number | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function readCount(
  sources: Array<Record<string, unknown> | null>,
  keys: string[],
): number | null {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const value = source[key];
      if (value == null) continue;
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed);
    }
  }
  return null;
}

export function readAddonUsageCountsFromPayload(
  payload: unknown,
  addonId?: string,
): AddonUsageCounts | null {
  const root = asRecord(payload);
  if (!root) return null;
  const counts = asRecord(root.counts);
  const usage = asRecord(root.usage);
  const stats = asRecord(root.stats);
  const summary = asRecord(root.summary);
  const buckets = asRecord(root.buckets);
  const lifecycle = asRecord(root.lifecycle);
  const addon = asRecord(root.addon);
  const resolvedAddonId =
    addonId ??
    (root.addonId as string | undefined) ??
    (root.addon_id as string | undefined) ??
    (root.id as string | undefined) ??
    (addon?.id as string | undefined);
  if (!resolvedAddonId) return null;
  const sources = [root, counts, usage, stats, summary, buckets, lifecycle];

  const activeUsers = readCount(sources, [
    "activeUsers",
    "active_users",
    "activeUserCount",
    "activeUsersCount",
    "activeCount",
    "active_count",
    "active",
  ]);
  const totalUsers = readCount(sources, [
    "totalUsers",
    "total_users",
    "totalUserCount",
    "total_count",
    "totalCount",
    "total",
  ]);
  const purchasedUsers = readCount(sources, [
    "purchasedUsers",
    "purchased_users",
    "totalPurchasedUsers",
    "total_purchased_users",
    "purchasedUserCount",
    "purchasedCount",
    "purchased_count",
    "purchased",
  ]);
  const expiredUsers = readCount(sources, [
    "expiredUsers",
    "expired_users",
    "expiredUserCount",
    "expiredCount",
    "expired_count",
    "expired",
  ]);
  const inactiveUsers = readCount(sources, [
    "inactiveUsers",
    "inactive_users",
    "inactiveUserCount",
    "inactiveCount",
    "inactive_count",
    "inactive",
  ]);

  if (
    activeUsers == null &&
    totalUsers == null &&
    purchasedUsers == null &&
    expiredUsers == null &&
    inactiveUsers == null
  ) {
    return null;
  }

  return {
    addonId: resolvedAddonId,
    activeUsers,
    totalUsers,
    purchasedUsers,
    expiredUsers,
    inactiveUsers,
  };
}

export const addonService = {
  async getAll(): Promise<CoachingAddon[]> {
    const { data } = await api.get("/admin/coaching/addons");
    return data.data ?? data;
  },

  async getById(addonId: string): Promise<CoachingAddon> {
    const { data } = await api.get(`/admin/coaching/addons/${addonId}`);
    return data.data ?? data;
  },

  async create(payload: CreateCoachingAddonPayload): Promise<CoachingAddon> {
    const { data } = await api.post("/admin/coaching/addons", payload);
    return data.data ?? data;
  },

  async update(
    addonId: string,
    payload: UpdateCoachingAddonPayload,
  ): Promise<CoachingAddon> {
    const { data } = await api.patch(
      `/admin/coaching/addons/${addonId}`,
      payload,
    );
    return data.data ?? data;
  },

  async remove(addonId: string, hard = false): Promise<void> {
    await api.delete(`/admin/coaching/addons/${addonId}`, {
      params: hard ? { hard: true } : undefined,
    });
  },

  async getAllUsageCounts(): Promise<AddonUsageCounts[]> {
    try {
      const { data } = await api.get("/admin/coaching/addons/usage");
      const payload = data.data ?? data;
      let rows: unknown[] = [];
      if (Array.isArray(payload)) {
        rows = payload;
      } else {
        const root = asRecord(payload);
        rows =
          (root?.items as unknown[] | undefined) ??
          (root?.addons as unknown[] | undefined) ??
          (root?.usage as unknown[] | undefined) ??
          (root?.data as unknown[] | undefined) ??
          [];
      }
      return rows
        .map((row) => readAddonUsageCountsFromPayload(row))
        .filter((row): row is AddonUsageCounts => row != null);
    } catch (error) {
      if (!axios.isAxiosError(error)) throw error;
      const status = error.response?.status;
      if (status === 404 || status === 405 || status === 501) return [];
      throw error;
    }
  },

  async getUsageCounts(addonId: string): Promise<AddonUsageCounts | null> {
    const endpoints = [
      `/admin/coaching/addons/${addonId}/usage-counts`,
      `/admin/coaching/addons/${addonId}/usage`,
      `/admin/coaching/addons/${addonId}/counts`,
      `/admin/coaching/addons/${addonId}/stats`,
    ];

    for (const endpoint of endpoints) {
      try {
        const { data } = await api.get(endpoint);
        return readAddonUsageCountsFromPayload(data.data ?? data, addonId);
      } catch (error) {
        if (!axios.isAxiosError(error)) throw error;
        const status = error.response?.status;
        if (status === 404 || status === 405 || status === 501) continue;
        throw error;
      }
    }

    return null;
  },
};
