import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { exerciseService } from "@/services/exerciseService";
import type { Exercise, ExerciseCategory } from "@/types/programs";

const CATEGORY_OPTIONS = [
  { value: "SQUAT", label: "Squat" },
  { value: "BENCH", label: "Bench" },
  { value: "DEADLIFT", label: "Deadlift" },
  { value: "ACCESSORY", label: "Accessory" },
  { value: "OTHER", label: "Other" },
];

const exerciseSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be kebab-case"),
  name: z.string().min(1, "Name is required"),
  category: z.enum(["SQUAT", "BENCH", "DEADLIFT", "ACCESSORY", "OTHER"]),
  description: z.string().optional(),
  videoUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().min(0),
});

type ExerciseFormData = z.infer<typeof exerciseSchema>;

interface ExerciseFormModalProps {
  exercise: Exercise | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExerciseFormModal({
  exercise,
  onClose,
  onSuccess,
}: ExerciseFormModalProps) {
  const isEdit = !!exercise;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema) as Resolver<ExerciseFormData>,
    defaultValues: exercise
      ? {
          slug: exercise.slug,
          name: exercise.name,
          category: exercise.category,
          description: exercise.description || "",
          videoUrl: exercise.videoUrl || "",
          isActive: exercise.isActive,
          sortOrder: exercise.sortOrder,
        }
      : {
          slug: "",
          name: "",
          category: "ACCESSORY" as ExerciseCategory,
          description: "",
          videoUrl: "",
          isActive: true,
          sortOrder: 0,
        },
  });

  const createMutation = useMutation({
    mutationFn: exerciseService.create,
    onSuccess: () => {
      toast.success("Exercise created!");
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof exerciseService.update>) =>
      exerciseService.update(...data),
    onSuccess: () => {
      toast.success("Exercise updated!");
      onSuccess();
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: ExerciseFormData) {
    const payload = {
      slug: data.slug,
      name: data.name,
      category: data.category,
      description: data.description || null,
      videoUrl: data.videoUrl || null,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    };

    if (isEdit && exercise) {
      updateMutation.mutate([exercise.id, payload]);
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Exercise" : "Create Exercise"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="exercise-slug"
              label="Slug"
              placeholder="high-bar-squat"
              error={errors.slug?.message}
              {...register("slug")}
            />
            <Input
              id="exercise-name"
              label="Name"
              placeholder="High Bar Squat"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>

          <Select
            id="exercise-category"
            label="Category"
            options={CATEGORY_OPTIONS}
            error={errors.category?.message}
            {...register("category")}
          />

          <Textarea
            id="exercise-description"
            label="Description"
            rows={2}
            placeholder="Olympic-style high bar squat..."
            error={errors.description?.message}
            {...register("description")}
          />

          <Input
            id="exercise-video"
            label="Video URL"
            placeholder="https://youtube.com/..."
            error={errors.videoUrl?.message}
            {...register("videoUrl")}
          />

          <Input
            id="exercise-sort"
            label="Sort Order"
            type="number"
            min={0}
            {...register("sortOrder")}
          />

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              {...register("isActive")}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Active
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
