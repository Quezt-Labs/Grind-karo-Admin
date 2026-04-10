import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { X, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { planService } from "@/services/planService";
import type { Plan, Program } from "@/types/program";

const planSchema = z.object({
  programId: z.string().min(1, "Program is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.coerce.number().min(100, "Min ₹1"),
  validityMonths: z.coerce.number().min(1, "Min 1 month"),
  features: z.array(z.object({ value: z.string() })),
  displayOrder: z.coerce.number().min(0),
  isActive: z.boolean(),
});

type PlanFormData = z.infer<typeof planSchema>;

interface PlanFormModalProps {
  plan: Plan | null;
  programs: Program[];
  onClose: () => void;
  onSuccess: () => void;
}

export function PlanFormModal({
  plan,
  programs,
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
    resolver: zodResolver(planSchema) as any,
    defaultValues: plan
      ? {
          programId: plan.programId,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          validityMonths: plan.validityMonths,
          features: plan.features.map((f) => ({ value: f })),
          displayOrder: plan.displayOrder,
          isActive: plan.isActive,
        }
      : {
          programId: "",
          name: "",
          description: "",
          price: 0,
          validityMonths: 3,
          features: [{ value: "" }],
          displayOrder: 0,
          isActive: true,
        },
  });

  const featuresArray = useFieldArray({ control, name: "features" });

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
      ...data,
      features: data.features.map((f) => f.value).filter(Boolean),
    };

    if (isEdit && plan) {
      updateMutation.mutate([plan.id, payload]);
    } else {
      createMutation.mutate(payload);
    }
  }

  const programOptions = programs.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
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

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          <Select
            id="programId"
            label="Program"
            options={programOptions}
            error={errors.programId?.message}
            {...register("programId")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="plan-name"
              label="Plan Name"
              placeholder="Premium"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              id="plan-price"
              label="Price (paise)"
              type="number"
              min={0}
              placeholder="449900"
              error={errors.price?.message}
              {...register("price")}
            />
          </div>

          <Textarea
            id="plan-description"
            label="Description"
            rows={2}
            placeholder="Extended access with personalized guidance"
            error={errors.description?.message}
            {...register("description")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="plan-validity"
              label="Validity (months)"
              type="number"
              min={1}
              placeholder="6"
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

          {/* Features */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Features
              </label>
              <button
                type="button"
                onClick={() => featuresArray.append({ value: "" })}
                className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {featuresArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder={`Feature ${index + 1}`}
                    {...register(`features.${index}.value`)}
                  />
                  {featuresArray.fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => featuresArray.remove(index)}
                      className="rounded p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

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
