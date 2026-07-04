import type { FormCheckInboxItem } from "@/services/formCheckInboxService";
import type { FormCheckCommentTarget } from "@/utils/bulkFormCheckComments";

export function formCheckVideoToTarget(
  video: FormCheckInboxItem,
): FormCheckCommentTarget | null {
  if (video.reviewed || video.coachComment?.trim()) return null;
  const label = `${video.exerciseName} · Set ${video.setNumber}`;
  if (video.source === "program") {
    if (!video.exerciseLogId) return null;
    return {
      source: "program",
      exerciseLogId: video.exerciseLogId,
      setNumber: video.setNumber,
      label,
    };
  }
  return {
    source: "sheet",
    sheetsSetVideoId: video.id,
    label,
  };
}

export function pendingTargetsForVideos(
  videos: FormCheckInboxItem[],
): FormCheckCommentTarget[] {
  return videos
    .map(formCheckVideoToTarget)
    .filter((target): target is FormCheckCommentTarget => target != null);
}
