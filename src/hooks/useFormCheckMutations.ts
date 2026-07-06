import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { invalidateFormCheckQueries } from "@/hooks/formCheckQueryKeys";
import { workoutVideoCommentService } from "@/services/workoutVideoCommentService";
import {
  bulkUpsertFormCheckComments,
  type BulkCommentResult,
  type FormCheckCommentTarget,
} from "@/utils/bulkFormCheckComments";

export function useFormCheckMutations(userId?: string) {
  const queryClient = useQueryClient();

  const invalidate = () => invalidateFormCheckQueries(queryClient, { userId });

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
    onSuccess: (_data, variables) => {
      toast.success(
        variables.setLabel
          ? `${variables.setLabel} saved`
          : `Set ${variables.setNumber} saved`,
      );
      invalidate();
    },
    onError: () => toast.error("Failed to save comment"),
  });

  const bulkApplyMutation = useMutation({
    mutationFn: ({
      targets,
      comment,
    }: {
      targets: FormCheckCommentTarget[];
      comment: string;
    }) => bulkUpsertFormCheckComments(targets, comment),
    onSuccess: (result: BulkCommentResult) => {
      if (result.failed === 0 && result.succeeded > 0) {
        toast.success(
          `${result.succeeded} set comment${result.succeeded === 1 ? "" : "s"} saved`,
        );
        invalidate();
        return;
      }
      if (result.succeeded > 0) {
        toast.error(`${result.succeeded} saved · ${result.failed} failed`);
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
    if (result.succeeded > 0) invalidate();
    return result;
  };

  return {
    saveCommentMutation,
    bulkApplyMutation,
    bulkApply,
    invalidate,
  };
}
