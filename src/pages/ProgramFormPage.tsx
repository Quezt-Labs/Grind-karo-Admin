import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Upload, X, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Spinner } from "@/components/ui/Spinner";
import { FormSection } from "@/components/ui/FormSection";
import { DynamicListField } from "@/components/programs/DynamicListField";
import { ProgramPreview } from "@/components/programs/ProgramPreview";
import { programService } from "@/services/programService";
import { uploadService } from "@/services/uploadService";

// --- Zod Schema ---
const programSchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().min(2, "Slug is required"),
  description: z.string().min(10, "Description must be at least 10 chars"),
  tagline: z.string().optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"]),
  duration: z.coerce.number().min(1, "Min 1 week"),
  frequency: z.string().min(1, "Frequency is required"),
  category: z.string().min(1, "Category is required"),
  badge: z.string().optional(),
  sortOrder: z.coerce.number().min(0).optional(),
  isActive: z.boolean(),
  highlights: z.array(z.object({ value: z.string() })),
  goals: z.array(z.object({ value: z.string() })),
});

type ProgramFormData = z.infer<typeof programSchema>;

const LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "ALL_LEVELS", label: "All Levels" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ProgramFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Image must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadService.upload(file);
      setImageUrl(result.url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
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
            {/* Basic Info */}
            <FormSection title="Basic Info">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="name"
                  label="Program Name"
                  placeholder="Total Strength Builder"
                  error={errors.name?.message}
                  {...register("name")}
                />
                <Input
                  id="slug"
                  label="Slug (URL)"
                  placeholder="total-strength-builder"
                  error={errors.slug?.message}
                  {...register("slug")}
                />
                <div className="sm:col-span-2">
                  <Textarea
                    id="description"
                    label="Description"
                    rows={3}
                    placeholder="12-week program for massive gains..."
                    error={errors.description?.message}
                    {...register("description")}
                  />
                </div>
                <Input
                  id="tagline"
                  label="Tagline (optional)"
                  placeholder="12-week program for massive gains"
                  {...register("tagline")}
                />
                <Input
                  id="category"
                  label="Category"
                  placeholder="Strength"
                  error={errors.category?.message}
                  {...register("category")}
                />
              </div>
            </FormSection>

            {/* Program Image */}
            <FormSection title="Program Image">
              <div className="space-y-3">
                {imageUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={imageUrl}
                      alt="Program"
                      className="h-40 w-auto rounded-lg border object-cover dark:border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-sm hover:bg-red-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex h-40 w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-primary-400 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-primary-500 dark:hover:bg-gray-700"
                  >
                    {isUploading ? (
                      <Spinner size="sm" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {isUploading ? "Uploading..." : "Click to upload image"}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      PNG, JPG up to 5MB
                    </span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 dark:text-primary-400"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {isUploading ? "Uploading..." : "Replace image"}
                  </button>
                )}
              </div>
            </FormSection>

            {/* Program Details */}
            <FormSection title="Program Details">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Select
                  id="level"
                  label="Level"
                  options={LEVEL_OPTIONS}
                  error={errors.level?.message}
                  {...register("level")}
                />
                <Input
                  id="duration"
                  label="Duration (weeks)"
                  type="number"
                  min={1}
                  placeholder="12"
                  error={errors.duration?.message}
                  {...register("duration")}
                />
                <Input
                  id="frequency"
                  label="Frequency"
                  placeholder="4-5 days/week"
                  error={errors.frequency?.message}
                  {...register("frequency")}
                />
                <Input
                  id="badge"
                  label="Badge (optional)"
                  placeholder="MOST_POPULAR"
                  {...register("badge")}
                />
                <Input
                  id="sortOrder"
                  label="Sort Order"
                  type="number"
                  min={0}
                  placeholder="1"
                  {...register("sortOrder")}
                />
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      {...register("isActive")}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Active
                    </span>
                  </label>
                </div>
              </div>
            </FormSection>

            {/* Highlights */}
            <DynamicListField
              title="Highlights"
              fieldArray={highlightsArray}
              register={register}
              name="highlights"
              placeholder="Highlight"
            />

            {/* Goals */}
            <DynamicListField
              title="Goals"
              fieldArray={goalsArray}
              register={register}
              name="goals"
              placeholder="Goal"
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
