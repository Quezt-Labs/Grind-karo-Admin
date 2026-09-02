import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import {
  invalidateFormCheckCounts,
  invalidateFormCheckQueries,
  patchFormCheckVideoComments,
  type FormCheckCommentPatch,
} from "@/hooks/formCheckQueryKeys";
import { workoutVideoCommentService } from "@/services/workoutVideoCommentService";
import {
  bulkUpsertFormCheckComments,
  type BulkCommentResult,
  type FormCheckCommentTarget,
} from "@/utils/bulkFormCheckComments";

export function useFormCheckMutations(userId?: string) {
  const queryClient = useQueryClient();

  const invalidate = () => invalidateFormCheckQueries(queryClient, { userId });

  const applyPatch = (patches: FormCheckCommentPatch[]) => {
    patchFormCheckVideoComments(queryClient, patches);
    invalidateFormCheckCounts(queryClient, { userId });
  };

  const saveCommentMutation = useMutation({
    mutationFn: (payload: {
      exerciseLogId: string;
      setNumber: number;
      comment: string;
      setLabel?: string;
      replyToCommentId?: string | null;
      replyThreadType?: "workout" | "sheets";
    }) => {
      const comment = payload.comment.trim();
      if (payload.replyToCommentId) {
        return workoutVideoCommentService
          .replyThread(
            payload.replyThreadType ?? "workout",
            payload.replyToCommentId,
            { reply: comment },
          )
          .catch(async (error: unknown) => {
            if (axios.isAxiosError(error)) {
              const status = error.response?.status;
              if (status === 403 || status === 404 || status === 405) {
                return workoutVideoCommentService.upsert({
                  exerciseLogId: payload.exerciseLogId,
                  setNumber: payload.setNumber,
                  comment,
                });
              }
            }
            throw error;
          });
      }
      return workoutVideoCommentService.upsert({
        exerciseLogId: payload.exerciseLogId,
        setNumber: payload.setNumber,
        comment,
      });
    },
    onSuccess: (data, variables) => {
      toast.success(
        variables.setLabel
          ? `${variables.setLabel} saved`
          : `Set ${variables.setNumber} saved`,
      );
      applyPatch([
        {
          exerciseLogId: variables.exerciseLogId,
          setNumber: variables.setNumber,
          comment: variables.comment.trim(),
          coachCommentId: data?.id ?? null,
          coachCommentUpdatedAt: data?.updatedAt ?? null,
        },
      ]);
      if (variables.replyToCommentId) {
        void queryClient.invalidateQueries({
          queryKey: [
            "form-check-comment-thread",
            variables.replyThreadType ?? "workout",
            variables.replyToCommentId,
          ],
        });
      }
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as
          | {
              message?: string | string[];
              replyLockReason?: string;
              reply_lock_reason?: string;
            }
          | undefined;
        const message = Array.isArray(data?.message)
          ? data.message.filter(Boolean).join(", ")
          : data?.message;
        toast.error(
          data?.replyLockReason ||
            data?.reply_lock_reason ||
            message ||
            "Failed to save comment",
        );
        return;
      }
      toast.error("Failed to save comment");
    },
  });

  const patchesForTargets = (
    targets: FormCheckCommentTarget[],
    comment: string,
  ): FormCheckCommentPatch[] =>
    targets.map((t) => ({
      exerciseLogId: t.exerciseLogId,
      setNumber: t.setNumber,
      comment: comment.trim(),
    }));

  const bulkApplyMutation = useMutation({
    mutationFn: ({
      targets,
      comment,
    }: {
      targets: FormCheckCommentTarget[];
      comment: string;
    }) => bulkUpsertFormCheckComments(targets, comment),
    onSuccess: (result: BulkCommentResult, variables) => {
      if (result.failed === 0 && result.succeeded > 0) {
        toast.success(
          `${result.succeeded} set comment${result.succeeded === 1 ? "" : "s"} saved`,
        );
        applyPatch(patchesForTargets(variables.targets, variables.comment));
        return;
      }
      if (result.succeeded > 0) {
        toast.error(`${result.succeeded} saved · ${result.failed} failed`);
        // Partial failure: we can't tell which targets stuck, so fall back to
        // a full refetch to resync with the server.
        invalidate();
        return;
      }
      toast.error("Failed to save comments");
    },
  });

  const bulkApply = async (
    targets: FormCheckCommentTarget[],
    comment: string,
  ): Promise<BulkCommentResult> => {
    const result = await bulkUpsertFormCheckComments(targets, comment);
    if (result.succeeded > 0 && result.failed === 0) {
      applyPatch(patchesForTargets(targets, comment));
    } else if (result.succeeded > 0) {
      invalidate();
    }
    return result;
  };

  return {
    saveCommentMutation,
    bulkApplyMutation,
    bulkApply,
    invalidate,
  };
}
