/**
 * Bulk form-check comments — frontend-only MVP (parallel existing upsert APIs).
 * Backend not required; see docs/BULK_FORM_CHECK_COMMENTS.md for trade-offs.
 */
import { isAxiosError } from "axios";
import { sheetsSetVideoCommentService } from "@/services/sheetsSetVideoService";
import { workoutVideoCommentService } from "@/services/workoutVideoCommentService";

export type FormCheckCommentTarget =
  | {
      source: "program";
      exerciseLogId: string;
      setNumber: number;
      label?: string;
    }
  | { source: "sheet"; sheetsSetVideoId: string; label?: string };

export type BulkCommentResult = {
  succeeded: number;
  failed: number;
  errors: { label: string; message: string }[];
};

function targetLabel(target: FormCheckCommentTarget): string {
  if (target.label) return target.label;
  if (target.source === "program") {
    return `Set ${target.setNumber}`;
  }
  return `Sheet video ${target.sheetsSetVideoId.slice(0, 8)}`;
}

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    const message = data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string" && message.trim()) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Failed to save comment";
}

async function upsertTarget(
  target: FormCheckCommentTarget,
  comment: string,
): Promise<void> {
  if (target.source === "program") {
    await workoutVideoCommentService.upsert({
      exerciseLogId: target.exerciseLogId,
      setNumber: target.setNumber,
      comment,
    });
    return;
  }
  await sheetsSetVideoCommentService.upsert({
    sheetsSetVideoId: target.sheetsSetVideoId,
    comment,
  });
}

export async function bulkUpsertFormCheckComments(
  targets: FormCheckCommentTarget[],
  comment: string,
): Promise<BulkCommentResult> {
  const trimmed = comment.trim();
  if (!trimmed || targets.length === 0) {
    return { succeeded: 0, failed: 0, errors: [] };
  }

  const results = await Promise.allSettled(
    targets.map((target) => upsertTarget(target, trimmed)),
  );

  let succeeded = 0;
  let failed = 0;
  const errors: BulkCommentResult["errors"] = [];

  results.forEach((result, index) => {
    const target = targets[index]!;
    if (result.status === "fulfilled") {
      succeeded += 1;
      return;
    }
    failed += 1;
    errors.push({
      label: targetLabel(target),
      message: errorMessage(result.reason),
    });
  });

  return { succeeded, failed, errors };
}
