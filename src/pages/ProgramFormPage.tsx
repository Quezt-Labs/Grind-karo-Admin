import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { FormPageSkeleton } from "@/components/ui/Shimmer";
import { ProgramFormFields } from "@/components/programs/ProgramFormFields";
import { ProgramPreview } from "@/components/programs/ProgramPreview";
import { programService } from "@/services/programService";
import {
  programSchema,
  slugify,
  type ProgramFormData,
} from "@/utils/programFormSchema";

export function ProgramFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["program", id],
    queryFn: () => programService.getById(id!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProgramFormData>({
    resolver: zodResolver(programSchema) as any,
    defaultValues: {
      isActive: true,
      sortOrder: 0,
      highlights: [{ value: "" }],
      goals: [{ value: "" }],
    },
  });

  const highlightsArray = useFieldArray({ control, name: "highlights" });
  const goalsArray = useFieldArray({ control, name: "goals" });
  const watchedValues = useWatch({ control });

  // Auto-generate slug from name
  const watchedName = useWatch({ control, name: "name" });
  useEffect(() => {
    if (!isEdit && watchedName) {
      setValue("slug", slugify(watchedName));
    }
  }, [watchedName, isEdit, setValue]);

  // Populate form when editing
  useEffect(() => {
    if (!existing) return;
    reset({
      name: existing.name,
      slug: existing.slug,
      description: existing.description,
      tagline: existing.tagline || "",
      level: existing.level,
      duration: existing.duration,
      frequency: existing.frequency,
      category: existing.category,
      badge: existing.badge || "",
      sortOrder: existing.sortOrder,
      isActive: existing.isActive,
      highlights: existing.highlights.map((h) => ({ value: h })),
      goals: existing.goals.map((g) => ({ value: g })),
    });
    setImageUrl(existing.image ?? null);
  }, [existing, reset]);

  const createMutation = useMutation({
    mutationFn: programService.create,
    onSuccess: () => {
      toast.success("Program created successfully!");
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      navigate("/programs");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof programService.update>) =>
      programService.update(...data),
    onSuccess: () => {
      toast.success("Program updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["program", id] });
      navigate("/programs");
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: ProgramFormData) {
    const payload = {
      ...data,
      tagline: data.tagline || undefined,
      badge: data.badge || undefined,
      sortOrder: data.sortOrder ?? 0,
      image: imageUrl || null,
      highlights: data.highlights.map((h) => h.value).filter(Boolean),
      goals: data.goals.map((g) => g.value).filter(Boolean),
    };

    if (isEdit) {
      updateMutation.mutate([id!, payload]);
    } else {
      createMutation.mutate(payload);
    }
  }

  if (isEdit && loadingExisting) {
    return <FormPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/programs")}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Program" : "Create Program"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isEdit
              ? "Update program details and pricing"
              : "Add a new coaching program with pricing tiers"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
            <ProgramFormFields
              register={register}
              errors={errors}
              highlightsArray={highlightsArray}
              goalsArray={goalsArray}
              imageUrl={imageUrl}
              onImageChange={setImageUrl}
            />

            {/* Submit */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/programs")}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving}>
                {isEdit ? "Update Program" : "Create Program"}
              </Button>
            </div>
          </form>
        </div>

        {/* Preview Panel */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <ProgramPreview
              name={watchedValues.name || ""}
              tagline={watchedValues.tagline}
              description={watchedValues.description || ""}
              level={watchedValues.level || ""}
              duration={Number(watchedValues.duration) || 0}
              frequency={watchedValues.frequency || ""}
              highlights={(watchedValues.highlights || []).map(
                (h) => h?.value || "",
              )}
              goals={(watchedValues.goals || []).map((g) => g?.value || "")}
              badge={watchedValues.badge}
              category={watchedValues.category || ""}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
