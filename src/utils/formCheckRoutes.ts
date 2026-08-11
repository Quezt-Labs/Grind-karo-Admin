export type FormCheckRouteThreadType = "workout" | "sheets";

export interface FormCheckThreadRouteParams {
  userId: string | null;
  videoId?: string | null;
  commentId?: string | null;
  messageId?: string | null;
  threadType?: FormCheckRouteThreadType | null;
}

export function buildFormCheckThreadRoute(
  params: FormCheckThreadRouteParams,
  action?: "reply",
): string {
  if (!params.userId) return "/form-checks";
  const query = new URLSearchParams({
    userId: params.userId,
    review: "all",
  });
  if (params.videoId) query.set("videoId", params.videoId);
  if (params.commentId) query.set("commentId", params.commentId);
  if (params.messageId) query.set("messageId", params.messageId);
  if (params.threadType) query.set("threadType", params.threadType);
  if (action) query.set("action", action);
  return `/form-checks?${query.toString()}`;
}
