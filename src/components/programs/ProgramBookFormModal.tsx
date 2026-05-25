import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { PdfUploadField } from "@/components/shared/PdfUploadField";
import { programService } from "@/services/programService";
import type { Program, ProgramBook } from "@/types/programs";

const schema = z.object({
  programId: z.string().uuid({ message: "Select a program" }),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  body: z.string().optional(),
  pdfUrl: z.string().url({ message: "Upload a PDF file" }),
  sortOrder: z.coerce.number().min(0),
});

type FormData = z.infer<typeof schema>;

interface ProgramBookFormModalProps {
  programs: Program[];
  book?: ProgramBook;
  defaultProgramId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProgramBookFormModal({
  programs,
  book,
  defaultProgramId,
  onClose,
  onSuccess,
}: ProgramBookFormModalProps) {
  const isEdit = !!book;
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: book
      ? {
          programId: book.programId,
          slug: book.slug,
          title: book.title,
          body: book.body,
          pdfUrl: book.pdfUrl ?? "",
          sortOrder: book.sortOrder,
        }
      : {
          programId: defaultProgramId ?? "",
          slug: "",
          title: "",
          body: "",
          pdfUrl: "",
          sortOrder: 0,
        },
  });

  const pdfUrl = watch("pdfUrl");

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      programService.createResource(d.programId, {
        slug: d.slug,
        title: d.title,
        resourceType: "pdf",
        body: d.body?.trim() || "",
        pdfUrl: d.pdfUrl,
        sortOrder: d.sortOrder,
      }),
    onSuccess: () => {
      toast.success("Book created");
      onSuccess();
    },
    onError: () => toast.error("Failed to create book"),
  });

  const updateMut = useMutation({
    mutationFn: (d: FormData) =>
      programService.updateResource(d.programId, book!.id, {
        slug: d.slug,
        title: d.title,
        resourceType: "pdf",
        body: d.body?.trim() || "",
        pdfUrl: d.pdfUrl,
        sortOrder: d.sortOrder,
      }),
    onSuccess: () => {
      toast.success("Book updated");
      onSuccess();
    },
    onError: () => toast.error("Failed to update book"),
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  function onSubmit(data: FormData) {
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Program Book" : "Add Program Book"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Program
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900"
              disabled={isEdit}
              {...register("programId")}
            >
              <option value="">Select program…</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.programId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.programId.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="book-slug"
              label="Slug"
              placeholder="gut-cut"
              error={errors.slug?.message}
              {...register("slug")}
            />
            <Input
              id="book-title"
              label="Title"
              placeholder="GUT Cut"
              error={errors.title?.message}
              {...register("title")}
            />
          </div>

          <PdfUploadField
            pdfUrl={pdfUrl || null}
            onPdfChange={(url) =>
              setValue("pdfUrl", url ?? "", { shouldValidate: true })
            }
          />
          {errors.pdfUrl && (
            <p className="text-sm text-red-600">{errors.pdfUrl.message}</p>
          )}

          <Textarea
            id="book-body"
            label="Description (optional)"
            rows={3}
            placeholder="Short note shown to athletes above the PDF…"
            {...register("body")}
          />

          <Input
            id="book-order"
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
