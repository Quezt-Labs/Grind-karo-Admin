import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { programService } from "@/services/programService";
import type { ProgramResource } from "@/types/programs";

const schema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  body: z.string().min(1, "Body is required"),
  sortOrder: z.coerce.number().min(0),
});

type FormData = z.infer<typeof schema>;

interface ResourceFormModalProps {
  programId: string;
  resource?: ProgramResource;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResourceFormModal({
  programId,
  resource,
  onClose,
  onSuccess,
}: ResourceFormModalProps) {
  const isEdit = !!resource;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: resource
      ? {
          slug: resource.slug,
          title: resource.title,
          body: resource.body,
          sortOrder: resource.sortOrder,
        }
      : {
          slug: "",
          title: "",
          body: "",
          sortOrder: 0,
        },
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      programService.createResource(programId, {
        slug: d.slug,
        title: d.title,
        resourceType: "markdown",
        body: d.body,
        sortOrder: d.sortOrder,
      }),
    onSuccess: () => {
      toast.success("Resource created");
      onSuccess();
    },
  });

  const updateMut = useMutation({
    mutationFn: (d: FormData) =>
      programService.updateResource(programId, resource!.id, {
        slug: d.slug,
        title: d.title,
        resourceType: "markdown",
        body: d.body,
        sortOrder: d.sortOrder,
      }),
    onSuccess: () => {
      toast.success("Resource updated");
      onSuccess();
    },
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  function onSubmit(data: FormData) {
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Resource" : "Add Resource"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="res-slug"
              label="Slug"
              placeholder="warmup"
              error={errors.slug?.message}
              {...register("slug")}
            />
            <Input
              id="res-title"
              label="Title"
              placeholder="Warmup"
              error={errors.title?.message}
              {...register("title")}
            />
          </div>

          <Textarea
            id="res-body"
            label="Body (Markdown)"
            rows={10}
            placeholder="# Warmup&#10;&#10;Use the built-in calculator..."
            error={errors.body?.message}
            {...register("body")}
          />

          <Input
            id="res-order"
            label="Sort Order"
            type="number"
            min={0}
            {...register("sortOrder")}
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
