import {
  useForm,
  useFieldArray,
  type Resolver,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { X, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { planService } from "@/services/planService";
import type { CoachingPlan } from "@/types/program";

const planSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be kebab-case"),
  name: z.string().min(1, "Name is required"),
  tagline: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().min(100, "Min ₹1 (100 paise)"),
  validityMonths: z.coerce.number().min(1, "Min 1 month"),
  includedFeatures: z.array(z.object({ value: z.string() })),
  excludedFeatures: z.array(z.object({ value: z.string() })),
  badge: z.string().optional(),
  displayOrder: z.coerce.number().min(0),
  isActive: z.boolean(),
});

type PlanFormData = z.infer<typeof planSchema>;

interface PlanFormModalProps {
  plan: CoachingPlan | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function PlanFormModal({
  plan,
  onClose,
  onSuccess,
}: PlanFormModalProps) {
  const isEdit = !!plan;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema) as Resolver<PlanFormData>,
    defaultValues: plan
      ? {
          slug: plan.slug,
          name: plan.name,
          tagline: plan.tagline || "",
          description: plan.description || "",
          price: plan.price,
          validityMonths: plan.validityMonths,
          includedFeatures: plan.includedFeatures.length
            ? plan.includedFeatures.map((f) => ({ value: f }))
            : [{ value: "" }],
          excludedFeatures: plan.excludedFeatures.length
            ? plan.excludedFeatures.map((f) => ({ value: f }))
            : [{ value: "" }],
          badge: plan.badge || "",
          displayOrder: plan.displayOrder,
          isActive: plan.isActive,
        }
      : {
          slug: "",
          name: "",
          tagline: "",
          description: "",
          price: 0,
          validityMonths: 3,
          includedFeatures: [{ value: "" }],
          excludedFeatures: [{ value: "" }],
          badge: "",
          displayOrder: 0,
          isActive: true,
        },
  });

  const includedArray = useFieldArray({ control, name: "includedFeatures" });
  const excludedArray = useFieldArray({ control, name: "excludedFeatures" });

  const createMutation = useMutation({
    mutationFn: planService.create,
    onSuccess: () => {
      toast.success("Plan created successfully!");
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof planService.update>) =>
      planService.update(...data),
    onSuccess: () => {
      toast.success("Plan updated successfully!");
      onSuccess();
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: PlanFormData) {
    const payload = {
      slug: data.slug,
      name: data.name,
      tagline: data.tagline || null,
      description: data.description || null,
      price: data.price,
      validityMonths: data.validityMonths,
      includedFeatures: data.includedFeatures
        .map((f) => f.value)
        .filter(Boolean),
      excludedFeatures: data.excludedFeatures
        .map((f) => f.value)
        .filter(Boolean),
      badge: data.badge || null,
      displayOrder: data.displayOrder,
      isActive: data.isActive,
    };

    if (isEdit && plan) {
      updateMutation.mutate([plan.id, payload]);
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Plan" : "Create Plan"}
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
              id="plan-slug"
              label="Slug"
              placeholder="mega"
              error={errors.slug?.message}
              {...register("slug")}
            />
            <Input
              id="plan-name"
              label="Plan Name"
              placeholder="Grind Karo — MEGA"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>

          <Input
            id="plan-tagline"
            label="Tagline"
            placeholder="Best value for serious athletes"
            error={errors.tagline?.message}
            {...register("tagline")}
          />

          <Textarea
            id="plan-description"
            label="Description"
            rows={2}
            placeholder="Extended access with personalized guidance"
            error={errors.description?.message}
            {...register("description")}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="plan-price"
              label="Price (paise)"
              type="number"
              min={0}
              placeholder="499900"
              error={errors.price?.message}
              {...register("price")}
            />
            <Input
              id="plan-validity"
              label="Validity (months)"
              type="number"
              min={1}
              placeholder="3"
              error={errors.validityMonths?.message}
              {...register("validityMonths")}
            />
            <Input
              id="plan-order"
              label="Display Order"
              type="number"
              min={0}
              placeholder="1"
              {...register("displayOrder")}
            />
          </div>

          <Input
            id="plan-badge"
            label="Badge (optional)"
            placeholder="BEST_VALUE"
            {...register("badge")}
          />

          {/* Included Features */}
          <FeatureList
            label="Included Features"
            fields={includedArray.fields}
            onAppend={() => includedArray.append({ value: "" })}
            onRemove={(i) => includedArray.remove(i)}
            register={register}
            prefix="includedFeatures"
          />

          {/* Excluded Features */}
          <FeatureList
            label="Excluded Features"
            fields={excludedArray.fields}
            onAppend={() => excludedArray.append({ value: "" })}
            onRemove={(i) => excludedArray.remove(i)}
            register={register}
            prefix="excludedFeatures"
          />

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

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEdit ? "Update Plan" : "Create Plan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FeatureList({
  label,
  fields,
  onAppend,
  onRemove,
  register,
  prefix,
}: {
  label: string;
  fields: { id: string }[];
  onAppend: () => void;
  onRemove: (index: number) => void;
  register: UseFormRegister<PlanFormData>;
  prefix: "includedFeatures" | "excludedFeatures";
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <button
          type="button"
          onClick={onAppend}
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder={`Feature ${index + 1}`}
              {...register(`${prefix}.${index}.value` as const)}
            />
            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="rounded p-1 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
