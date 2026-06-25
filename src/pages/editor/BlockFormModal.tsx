import { useForm, Controller, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormModal } from "@/components/ui/FormModal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { programService } from "@/services/programService";
import type { Block } from "@/types/programs";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const BLOCK_TYPE_OPTIONS = [
  { value: "MAIN", label: "Main" },
  { value: "DELOAD", label: "Deload" },
  { value: "PEAK", label: "Peak" },
  { value: "CUSTOM", label: "Custom" },
];

const schema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  blockType: z.enum(["MAIN", "DELOAD", "PEAK", "CUSTOM"]),
  description: z.string().optional(),
  displayOrder: z.coerce.number().min(0),
});

type FormData = z.infer<typeof schema>;

interface BlockFormModalProps {
  programId: string;
  block?: Block;
  onClose: () => void;
  onSuccess: () => void;
}

export function BlockFormModal({
  programId,
  block,
  onClose,
  onSuccess,
}: BlockFormModalProps) {
  const isEdit = !!block;
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: block
      ? {
          slug: block.slug,
          name: block.name,
          blockType: (block.blockType ?? "MAIN") as FormData["blockType"],
          description: block.description || "",
          displayOrder: block.displayOrder,
        }
      : {
          slug: "",
          name: "",
          blockType: "MAIN",
          description: "",
          displayOrder: 0,
        },
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      programService.createBlock(programId, {
        ...d,
        description: d.description || null,
      }),
    onSuccess: () => {
      toast.success("Block created");
      onSuccess();
    },
  });
  const updateMut = useMutation({
    mutationFn: (d: FormData) =>
      programService.updateBlock(programId, block!.id, {
        ...d,
        description: d.description || null,
      }),
    onSuccess: () => {
      toast.success("Block updated");
      onSuccess();
    },
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  const watchedName = useWatch({ control, name: "name" });
  const [slugTouched, setSlugTouched] = useState(isEdit);
  useEffect(() => {
    if (isEdit || slugTouched) return;
    setValue("slug", toSlug(watchedName ?? ""), { shouldValidate: true });
  }, [watchedName, isEdit, slugTouched, setValue]);

  function onSubmit(data: FormData) {
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  }

  return (
    <FormModal
      title={isEdit ? "Edit Block" : "Add Block"}
      onClose={onClose}
      contentClassName="max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="block-name"
            label="Name"
            placeholder="Program 1"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            id="block-slug"
            label="Slug"
            placeholder="program-1"
            error={errors.slug?.message}
            {...register("slug", {
              onChange: () => setSlugTouched(true),
            })}
          />
        </div>
        <Controller
          control={control}
          name="blockType"
          render={({ field }) => (
            <Select
              id="block-type"
              label="Block Type"
              options={BLOCK_TYPE_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.blockType?.message}
            />
          )}
        />
        <Textarea
          id="block-desc"
          label="Description"
          rows={2}
          {...register("description")}
        />
        <Input
          id="block-order"
          label="Display Order"
          type="number"
          min={0}
          {...register("displayOrder")}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
