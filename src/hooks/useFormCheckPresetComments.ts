import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formCheckPresetCommentsService,
  type FormCheckPresetComment,
} from "@/services/formCheckPresetCommentsService";

export const formCheckPresetCommentsKey = [
  "form-check-preset-comments",
] as const;

export function useFormCheckPresetComments() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: formCheckPresetCommentsKey,
    queryFn: () => formCheckPresetCommentsService.list(),
    staleTime: 60_000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: formCheckPresetCommentsKey });

  const createMutation = useMutation({
    mutationFn: (body: string) => formCheckPresetCommentsService.create(body),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      formCheckPresetCommentsService.update(id, { body }),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => formCheckPresetCommentsService.remove(id),
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => formCheckPresetCommentsService.reorder(ids),
    onSuccess: (items) => {
      queryClient.setQueryData<FormCheckPresetComment[]>(
        formCheckPresetCommentsKey,
        items,
      );
    },
  });

  return {
    comments: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    createMutation,
    updateMutation,
    removeMutation,
    reorderMutation,
  };
}
