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
import { programService } from "@/services/programService";
import type { Block } from "@/types/programs";

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
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: block
      ? {
          slug: block.slug,
          name: block.name,
          blockType: block.blockType,
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

  function onSubmit(data: FormData) {
    isEdit ? updateMut.mutate(data) : createMut.mutate(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Block" : "Add Block"}
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
              id="block-slug"
              label="Slug"
              placeholder="program-1"
              error={errors.slug?.message}
              {...register("slug")}
            />
            <Input
              id="block-name"
              label="Name"
              placeholder="Program 1"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>
          <Select
            id="block-type"
            label="Block Type"
            options={BLOCK_TYPE_OPTIONS}
            error={errors.blockType?.message}
            {...register("blockType")}
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
      </div>
    </div>
  );
}
