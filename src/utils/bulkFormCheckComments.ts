/**
 * Bulk form-check comments — frontend-only MVP (parallel existing upsert APIs).
 */
import { isAxiosError } from "axios";
import { workoutVideoCommentService } from "@/services/workoutVideoCommentService";

export type FormCheckCommentTarget = {
  source: "program";
  exerciseLogId: string;
  setNumber: number;
  label?: string;
};

export type BulkCommentResult = {
  succeeded: number;
  failed: number;
  errors: { label: string; message: string }[];
};

function targetLabel(target: FormCheckCommentTarget): string {
  if (target.label) return target.label;
  return `Set ${target.setNumber}`;
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
  await workoutVideoCommentService.upsert({
    exerciseLogId: target.exerciseLogId,
    setNumber: target.setNumber,
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
