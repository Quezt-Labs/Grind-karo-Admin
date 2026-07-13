import type { ReviewFilter } from "@/hooks/useFormCheckInboxRoute";
import type { FormCheckInboxItem } from "@/services/formCheckInboxService";

export function hasFormCheckFeedback(
  video: Pick<FormCheckInboxItem, "coachComment">,
): boolean {
  return Boolean(video.coachComment?.trim());
}

/** Single source of truth: reviewed iff coach left non-empty feedback. */
export function isFormCheckReviewed(
  video: Pick<FormCheckInboxItem, "coachComment" | "reviewed">,
): boolean {
  return hasFormCheckFeedback(video);
}

export function isFormCheckPending(
  video: Pick<FormCheckInboxItem, "coachComment" | "reviewed">,
): boolean {
  return !isFormCheckReviewed(video);
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
  if (reviewFilter === "pending") {
    return items.filter((item) => isFormCheckPending(item));
  }
  if (reviewFilter === "reviewed") {
    return items.filter((item) => isFormCheckReviewed(item));
  }
  return items;
}

export function sortFeedbackVideos(
  items: FormCheckInboxItem[],
): FormCheckInboxItem[] {
  return [...items]
    .filter((item) => isFormCheckReviewed(item))
    .sort((a, b) => {
      const aReviewed = isFormCheckReviewed(a) ? 1 : 0;
      const bReviewed = isFormCheckReviewed(b) ? 1 : 0;
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
