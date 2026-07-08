import { useMutation, useQueryClient } from "@tanstack/react-query";
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

  // Keep the commented video on screen (patch in place) and only refresh
  // counts — refetching the list would drop it from the `uncommentedOnly` view.
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
    }) =>
      workoutVideoCommentService.upsert({
        exerciseLogId: payload.exerciseLogId,
        setNumber: payload.setNumber,
        comment: payload.comment.trim(),
      }),
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
    },
    onError: () => toast.error("Failed to save comment"),
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
