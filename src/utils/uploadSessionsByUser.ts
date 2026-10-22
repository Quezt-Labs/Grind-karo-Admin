import type { AdminUploadSessionItem } from "@/services/uploadSessionsService";

export type UserUploadSummary = {
  userId: string;
  label: string;
  email: string | null;
  byState: Record<string, number>;
  failuresByCode: Record<string, number>;
  sessions: AdminUploadSessionItem[];
};

export const UPLOAD_SESSION_STATES = [
  "QUEUED",
  "UPLOADING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "RETRY",
] as const;

export function athleteDisplayLabel(item: AdminUploadSessionItem): string {
  const name = item.userName?.trim();
  if (name) return name;
  if (item.userEmail?.trim()) return item.userEmail.trim();
  return `${item.userId.slice(0, 8)}…`;
}

export function groupUploadSessionsByUser(
  items: AdminUploadSessionItem[],
): UserUploadSummary[] {
  const map = new Map<string, UserUploadSummary>();

  for (const session of items) {
    let row = map.get(session.userId);
    if (!row) {
      row = {
        userId: session.userId,
        label: athleteDisplayLabel(session),
        email: session.userEmail ?? null,
        byState: {},
        failuresByCode: {},
        sessions: [],
      };
      map.set(session.userId, row);
    }
    row.sessions.push(session);
    row.byState[session.state] = (row.byState[session.state] ?? 0) + 1;
    if (session.state === "FAILED") {
      const code = session.failureCode?.trim() || "UNKNOWN";
      row.failuresByCode[code] = (row.failuresByCode[code] ?? 0) + 1;
    }
  }

  return [...map.values()].sort((a, b) => {
    const failA = a.byState.FAILED ?? 0;
    const failB = b.byState.FAILED ?? 0;
    if (failB !== failA) return failB - failA;
    return b.sessions.length - a.sessions.length;
  });
}

export function filterSessionsByAthleteQuery(
  items: AdminUploadSessionItem[],
  query: string,
): AdminUploadSessionItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((row) => {
    const name = row.userName?.toLowerCase() ?? "";
    const email = row.userEmail?.toLowerCase() ?? "";
    const id = row.userId.toLowerCase();
    return name.includes(q) || email.includes(q) || id.includes(q);
  });
}
