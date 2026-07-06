import type { ReviewFilter } from "@/hooks/useFormCheckInboxRoute";
import type { FormCheckInboxItem } from "@/services/formCheckInboxService";

export function hasFormCheckFeedback(
  video: Pick<FormCheckInboxItem, "coachComment">,
): boolean {
  return Boolean(video.coachComment?.trim());
}

export function formCheckInboxListParams(reviewFilter: ReviewFilter): {
  uncommentedOnly?: boolean;
  commentedOnly?: boolean;
} {
  if (reviewFilter === "pending") return { uncommentedOnly: true };
  if (reviewFilter === "reviewed") return { commentedOnly: true };
  return {};
}

export function filterVideosByReview(
  items: FormCheckInboxItem[],
  reviewFilter: ReviewFilter,
): FormCheckInboxItem[] {
  if (reviewFilter !== "reviewed") return items;
  return items.filter((item) => hasFormCheckFeedback(item));
}

export function sortFeedbackVideos(
  items: FormCheckInboxItem[],
): FormCheckInboxItem[] {
  return [...items]
    .filter((item) => hasFormCheckFeedback(item))
    .sort((a, b) => {
      const aReviewed = a.reviewed ? 1 : 0;
      const bReviewed = b.reviewed ? 1 : 0;
      if (aReviewed !== bReviewed) return bReviewed - aReviewed;

      const aTime = a.coachCommentUpdatedAt
        ? new Date(a.coachCommentUpdatedAt).getTime()
        : 0;
      const bTime = b.coachCommentUpdatedAt
        ? new Date(b.coachCommentUpdatedAt).getTime()
        : 0;
      if (bTime !== aTime) return bTime - aTime;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}
