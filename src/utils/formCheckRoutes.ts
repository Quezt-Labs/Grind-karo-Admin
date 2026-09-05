import {
  FORM_CHECK_CLIENTS_PATH,
  FORM_CHECK_INBOX_PATH,
} from "@/lib/formCheckNavRoutes";
import type { ReviewFilter } from "@/hooks/useFormCheckInboxRoute";
import type { FormCheckCoachingClient } from "@/services/formCheckInboxService";

export type FormCheckRouteThreadType = "workout" | "sheets";
export type FormCheckRouteTier = "mega" | "ultra";

export interface FormCheckThreadRouteParams {
  userId: string | null;
  videoId?: string | null;
  commentId?: string | null;
  messageId?: string | null;
  threadType?: FormCheckRouteThreadType | null;
  tier?: FormCheckRouteTier | null;
  review?: ReviewFilter;
  returnTo?: string | null;
}

export function buildFormCheckThreadRoute(
  params: FormCheckThreadRouteParams,
  action?: "reply",
): string {
  if (!params.userId) return FORM_CHECK_INBOX_PATH;
  const query = new URLSearchParams({
    userId: params.userId,
    review: params.review ?? "all",
  });
  if (params.tier) query.set("tier", params.tier);
  if (params.returnTo) query.set("returnTo", params.returnTo);
  if (params.videoId) query.set("videoId", params.videoId);
  if (params.commentId) query.set("commentId", params.commentId);
  if (params.messageId) query.set("messageId", params.messageId);
  if (params.threadType) query.set("threadType", params.threadType);
  if (action) query.set("action", action);
  return `${FORM_CHECK_INBOX_PATH}?${query.toString()}`;
}

export function buildCoachingClientFormCheckRoute(
  client: Pick<
    FormCheckCoachingClient,
    "userId" | "activePlanTier" | "pendingFormCheckCount"
  >,
  returnTo = FORM_CHECK_CLIENTS_PATH,
): string {
  const tier =
    client.activePlanTier === "mega" || client.activePlanTier === "ultra"
      ? client.activePlanTier
      : undefined;

  return buildFormCheckThreadRoute({
    userId: client.userId,
    tier,
    review: client.pendingFormCheckCount > 0 ? "pending" : "all",
    returnTo,
  });
}

export function buildCoachingClientProfileRoute(
  userId: string,
  isAdmin: boolean,
): string {
  return isAdmin
    ? `/users/${userId}?tab=activity&section=videos`
    : `/coach/athletes/${userId}?tab=videos`;
}

export function buildCoachingClientChatRoute(userId: string): string {
  return `/chat?userId=${encodeURIComponent(userId)}`;
}
