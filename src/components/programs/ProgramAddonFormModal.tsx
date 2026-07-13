import { useEffect, useState } from "react";
import { useForm, Controller, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { programAddonService } from "@/services/programAddonService";
import type { ProgramAddon } from "@/types/program";
import { apiErrorMessage } from "@/utils/apiErrorMessage";
import { toSlug } from "@/utils/toSlug";

const schema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be kebab-case"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().int("Must be a whole number").min(1, "Min ₹1"),
  grantsFormCheck: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
});

type FormData = z.infer<typeof schema>;

interface ProgramAddonFormModalProps {
  addon: ProgramAddon | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProgramAddonFormModal({
  addon,
  onClose,
  onSuccess,
}: ProgramAddonFormModalProps) {
  const isEdit = !!addon;
  const [slugTouched, setSlugTouched] = useState(isEdit);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: addon
      ? {
          slug: addon.slug,
          name: addon.name,
          description: addon.description || "",
          price: addon.price,
          grantsFormCheck: addon.grantsFormCheck,
          isActive: addon.isActive,
          sortOrder: addon.sortOrder,
        }
      : {
          slug: "",
          name: "",
          description: "",
          price: 999,
          grantsFormCheck: true,
          isActive: true,
          sortOrder: 0,
        },
  });

  const watchedName = useWatch({ control, name: "name" });

  useEffect(() => {
    if (isEdit || slugTouched) return;
    const next = toSlug(watchedName || "");
    setValue("slug", next, { shouldValidate: next.length > 0 });
  }, [watchedName, isEdit, slugTouched, setValue]);

  const createMutation = useMutation({
    mutationFn: programAddonService.create,
    onSuccess: () => {
      toast.success("Program add-on created!");
      onSuccess();
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, "Failed to create program add-on")),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof programAddonService.update>[1];
    }) => programAddonService.update(id, payload),
    onSuccess: () => {
      toast.success("Program add-on updated!");
      onSuccess();
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, "Failed to update program add-on")),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: FormData) {
    const payload = {
      slug: data.slug.trim(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      price: Math.round(data.price),
      grantsFormCheck: data.grantsFormCheck,
      isActive: data.isActive,
      sortOrder: Math.round(data.sortOrder),
    };

    if (isEdit && addon) {
      updateMutation.mutate({ id: addon.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Program Add-on" : "Create Program Add-on"}
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
              id="pa-slug"
              label="Slug"
              placeholder="form-check"
              error={errors.slug?.message}
              {...register("slug", {
                onChange: () => setSlugTouched(true),
              })}
            />
            <Input
              id="pa-name"
              label="Name"
              placeholder="Form Check Logging"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>

          <Textarea
            id="pa-description"
            label="Description"
            rows={2}
            {...register("description")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="pa-price"
              label="Price (₹)"
              type="number"
              min={1}
              step={1}
              error={errors.price?.message}
              {...register("price")}
            />
            <Input
              id="pa-sort"
              label="Sort Order"
              type="number"
              min={0}
              step={1}
              error={errors.sortOrder?.message}
              {...register("sortOrder")}
            />
          </div>

          <Controller
            control={control}
            name="grantsFormCheck"
            render={({ field }) => (
              <CheckboxField
                id="prog-addon-form-check"
                label="Grants form-check (set video uploads)"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <CheckboxField
                id="prog-addon-active"
                label="Active"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
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
