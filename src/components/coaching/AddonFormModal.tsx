import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { addonService } from "@/services/addonService";
import type { CoachingAddon } from "@/types/program";

const addonSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be kebab-case"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(100, "Min ₹1 (100 paise)"),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().min(0),
});

type AddonFormData = z.infer<typeof addonSchema>;

interface AddonFormModalProps {
  addon: CoachingAddon | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddonFormModal({
  addon,
  onClose,
  onSuccess,
}: AddonFormModalProps) {
  const isEdit = !!addon;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddonFormData>({
    resolver: zodResolver(addonSchema) as Resolver<AddonFormData>,
    defaultValues: addon
      ? {
          slug: addon.slug,
          name: addon.name,
          description: addon.description || "",
          price: addon.price,
          isActive: addon.isActive,
          sortOrder: addon.sortOrder,
        }
      : {
          slug: "",
          name: "",
          description: "",
          price: 0,
          isActive: true,
          sortOrder: 0,
        },
  });

  const createMutation = useMutation({
    mutationFn: addonService.create,
    onSuccess: () => {
      toast.success("Add-on created successfully!");
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof addonService.update>) =>
      addonService.update(...data),
    onSuccess: () => {
      toast.success("Add-on updated successfully!");
      onSuccess();
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: AddonFormData) {
    const payload = {
      slug: data.slug,
      name: data.name,
      description: data.description || null,
      price: data.price,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    };

    if (isEdit && addon) {
      updateMutation.mutate([addon.id, payload]);
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Add-on" : "Create Add-on"}
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
              id="addon-slug"
              label="Slug"
              placeholder="nutrition-guidance"
              error={errors.slug?.message}
              {...register("slug")}
            />
            <Input
              id="addon-name"
              label="Name"
              placeholder="Nutrition Guidance"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>

          <Textarea
            id="addon-description"
            label="Description"
            rows={2}
            placeholder="Personalized nutrition plan"
            error={errors.description?.message}
            {...register("description")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="addon-price"
              label="Price (paise)"
              type="number"
              min={0}
              placeholder="99900"
              error={errors.price?.message}
              {...register("price")}
            />
            <Input
              id="addon-sort"
              label="Sort Order"
              type="number"
              min={0}
              placeholder="0"
              {...register("sortOrder")}
            />
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
              {isEdit ? "Update Add-on" : "Create Add-on"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
