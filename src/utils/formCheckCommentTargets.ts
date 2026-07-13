import type { FormCheckInboxItem } from "@/services/formCheckInboxService";
import type { FormCheckCommentTarget } from "@/utils/bulkFormCheckComments";
import { isFormCheckPending } from "@/utils/formCheckReview";

export function formCheckVideoToTarget(
  video: FormCheckInboxItem,
): FormCheckCommentTarget | null {
  if (video.source !== "program") return null;
  if (!isFormCheckPending(video)) return null;
  if (!video.exerciseLogId) return null;

  return {
    source: "program",
    exerciseLogId: video.exerciseLogId,
    setNumber: video.setNumber,
    label: `${video.exerciseName} · Set ${video.setNumber}`,
  };
}

export function pendingTargetsForVideos(
  videos: FormCheckInboxItem[],
): FormCheckCommentTarget[] {
  return videos
    .map(formCheckVideoToTarget)
    .filter((target): target is FormCheckCommentTarget => target != null);
}
