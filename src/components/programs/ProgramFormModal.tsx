import {
  useForm,
  useFieldArray,
  useWatch,
  Controller,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { FormModal } from "@/components/ui/FormModal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ImageUploadField } from "@/components/shared/ImageUploadField";
import { PdfUploadField } from "@/components/shared/PdfUploadField";
import { programService } from "@/services/programService";
import type { Program, ProgramTree } from "@/types/programs";

/** Strip a full Google Sheets URL down to just the file id segment */
function extractSheetId(value: string): string {
  const match = value.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : value.trim();
}

import { toSlug } from "@/utils/toSlug";

const programSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be kebab-case"),
  name: z.string().min(1, "Name is required"),
  tagline: z.string().optional(),
  description: z.string().optional(),
  coverImageUrl: z.string().nullable().optional(),
  pdfUrl: z.union([z.string().url(), z.literal("")]).optional(),
  badge: z.string().optional(),
  regularPrice: z.coerce.number().min(0, "Min ₹0"),
  salePrice: z.coerce.number().min(0).nullable().optional(),
  currency: z.string().default("INR"),
  liftingFrequency: z.string().optional(),
  programLengthWeeks: z.coerce.number().min(1).nullable().optional(),
  highlights: z.array(z.object({ value: z.string() })),
  displayOrder: z.coerce.number().min(0),
  isActive: z.boolean(),
  googleSpreadsheetId: z
    .string()
    .optional()
    .transform((v) => (v ? extractSheetId(v) : v))
    .refine(
      (v) => !v || /^[a-zA-Z0-9_-]+$/.test(v),
      "Must be a valid Google Sheets file id (alphanumeric, _ and - only)",
    ),
  autoAssignSheetId: z
    .string()
    .optional()
    .transform((v) => (v ? extractSheetId(v) : v))
    .refine(
      (v) => !v || /^[a-zA-Z0-9_-]+$/.test(v),
      "Must be a valid Google Sheets file id (alphanumeric, _ and - only)",
    ),
});

type ProgramFormData = z.infer<typeof programSchema>;

interface ProgramFormModalProps {
  program: Program | ProgramTree | null;
  onClose: () => void;
  onSuccess: () => void;
}

function programHasResources(
  program: Program | ProgramTree,
): program is ProgramTree {
  return "resources" in program && Array.isArray(program.resources);
}

export function ProgramFormModal({
  program,
  onClose,
  onSuccess,
}: ProgramFormModalProps) {
  const isEdit = !!program;
  const hasInlineResources = program ? programHasResources(program) : false;

  const { data: fetchedResources } = useQuery({
    queryKey: ["program-resources", program?.id],
    queryFn: () => programService.getResources(program!.id),
    enabled: isEdit && !!program?.id && !hasInlineResources,
  });

  const existingPdfResource = useMemo(() => {
    const resources =
      program && hasInlineResources && programHasResources(program)
        ? program.resources
        : fetchedResources;
    return resources?.find((r) => r.resourceType === "pdf");
  }, [hasInlineResources, program, fetchedResources]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProgramFormData>({
    resolver: zodResolver(programSchema) as Resolver<ProgramFormData>,
    defaultValues: program
      ? {
          slug: program.slug,
          name: program.name,
          tagline: program.tagline || "",
          description: program.description || "",
          coverImageUrl: program.coverImageUrl,
          pdfUrl: existingPdfResource?.pdfUrl ?? "",
          badge: program.badge || "",
          regularPrice: program.regularPrice,
          salePrice: program.salePrice,
          currency: program.currency || "INR",
          liftingFrequency: program.liftingFrequency || "",
          programLengthWeeks: program.programLengthWeeks,
          highlights: program.highlights.length
            ? program.highlights.map((h) => ({ value: h }))
            : [{ value: "" }],
          displayOrder: program.displayOrder,
          isActive: program.isActive,
          googleSpreadsheetId: program.googleSpreadsheetId ?? "",
          autoAssignSheetId: program.autoAssignSheetId ?? "",
        }
      : {
          slug: "",
          name: "",
          tagline: "",
          description: "",
          coverImageUrl: null,
          pdfUrl: "",
          badge: "",
          regularPrice: 0,
          salePrice: null,
          currency: "INR",
          liftingFrequency: "",
          programLengthWeeks: null,
          highlights: [{ value: "" }],
          displayOrder: 0,
          isActive: true,
          googleSpreadsheetId: "",
          autoAssignSheetId: "",
        },
  });

  const highlightsArray = useFieldArray({ control, name: "highlights" });
  const coverImageUrl = useWatch({ control, name: "coverImageUrl" });
  const pdfUrl = useWatch({ control, name: "pdfUrl" });
  const watchedName = useWatch({ control, name: "name" });

  useEffect(() => {
    if (!isEdit || !existingPdfResource?.pdfUrl) return;
    setValue("pdfUrl", existingPdfResource.pdfUrl, { shouldValidate: true });
  }, [isEdit, existingPdfResource?.pdfUrl, setValue]);

  // Auto-generate slug from name (only when creating, and user hasn't manually edited the slug)
  const [slugTouched, setSlugTouched] = useState(isEdit);

  useEffect(() => {
    if (isEdit || slugTouched) return;
    setValue("slug", toSlug(watchedName ?? ""), { shouldValidate: true });
  }, [watchedName, isEdit, slugTouched, setValue]);

  async function syncProgramPdf(
    programId: string,
    slug: string,
    name: string,
    nextPdfUrl: string | null | undefined,
  ) {
    const pdfUrlValue = nextPdfUrl?.trim() || null;

    if (pdfUrlValue) {
      if (existingPdfResource) {
        await programService.updateResource(programId, existingPdfResource.id, {
          resourceType: "pdf",
          pdfUrl: pdfUrlValue,
          slug: `${slug}-book`,
          title: name,
        });
      } else {
        await programService.createResource(programId, {
          slug: `${slug}-book`,
          title: name,
          resourceType: "pdf",
          pdfUrl: pdfUrlValue,
          body: "",
          sortOrder: 0,
        });
      }
      return;
    }

    if (existingPdfResource) {
      await programService.removeResource(programId, existingPdfResource.id);
    }
  }

  const createMutation = useMutation({
    mutationFn: async (data: ProgramFormData) => {
      const created = await programService.create({
        slug: data.slug,
        name: data.name,
        tagline: data.tagline || null,
        description: data.description || null,
        coverImageUrl: data.coverImageUrl || null,
        badge: data.badge || null,
        regularPrice: data.regularPrice,
        salePrice: data.salePrice || null,
        currency: data.currency,
        liftingFrequency: data.liftingFrequency || null,
        programLengthWeeks: data.programLengthWeeks || null,
        highlights: data.highlights.map((h) => h.value).filter(Boolean),
        displayOrder: data.displayOrder,
        isActive: data.isActive,
        googleSpreadsheetId: data.googleSpreadsheetId || null,
        autoAssignSheetId: data.autoAssignSheetId || null,
      });
      await syncProgramPdf(created.id, data.slug, data.name, data.pdfUrl);
      return created;
    },
    onSuccess: () => {
      toast.success("Program created!");
      onSuccess();
    },
    onError: () => toast.error("Failed to create program"),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProgramFormData) => {
      const updated = await programService.update(program!.id, {
        slug: data.slug,
        name: data.name,
        tagline: data.tagline || null,
        description: data.description || null,
        coverImageUrl: data.coverImageUrl || null,
        badge: data.badge || null,
        regularPrice: data.regularPrice,
        salePrice: data.salePrice || null,
        currency: data.currency,
        liftingFrequency: data.liftingFrequency || null,
        programLengthWeeks: data.programLengthWeeks || null,
        highlights: data.highlights.map((h) => h.value).filter(Boolean),
        displayOrder: data.displayOrder,
        isActive: data.isActive,
        googleSpreadsheetId: data.googleSpreadsheetId || null,
        autoAssignSheetId: data.autoAssignSheetId || null,
      });
      await syncProgramPdf(program!.id, data.slug, data.name, data.pdfUrl);
      return updated;
    },
    onSuccess: () => {
      toast.success("Program updated!");
      onSuccess();
    },
    onError: () => toast.error("Failed to update program"),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: ProgramFormData) {
    if (isEdit && program) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <FormModal
      title={isEdit ? "Edit Program" : "Create Program"}
      onClose={onClose}
      contentClassName="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="prog-name"
            label="Program Name"
            placeholder="9to5 Powerbuilder"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            id="prog-slug"
            label="Slug"
            placeholder="9to5-powerbuilder"
            error={errors.slug?.message}
            {...register("slug", {
              onChange: () => setSlugTouched(true),
            })}
          />
        </div>

        <Input
          id="prog-tagline"
          label="Tagline"
          placeholder="Designed for busy professionals"
          {...register("tagline")}
        />

        <Textarea
          id="prog-description"
          label="Description"
          rows={3}
          placeholder="Long-form description with markdown support..."
          {...register("description")}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Cover Image
          </label>
          <ImageUploadField
            imageUrl={coverImageUrl ?? null}
            onImageChange={(url) => setValue("coverImageUrl", url)}
          />
        </div>

        <PdfUploadField
          pdfUrl={pdfUrl?.trim() ? pdfUrl : null}
          onPdfChange={(url) =>
            setValue("pdfUrl", url ?? "", { shouldValidate: true })
          }
        />
        {errors.pdfUrl && (
          <p className="text-sm text-red-600">{errors.pdfUrl.message}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            id="prog-regular-price"
            label="Regular Price (₹)"
            type="number"
            min={0}
            placeholder="3499"
            error={errors.regularPrice?.message}
            {...register("regularPrice")}
          />
          <Input
            id="prog-sale-price"
            label="Sale Price (₹)"
            type="number"
            min={0}
            placeholder="1999"
            {...register("salePrice")}
          />
          <Input
            id="prog-order"
            label="Display Order"
            type="number"
            min={0}
            {...register("displayOrder")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="prog-frequency"
            label="Lifting Frequency"
            placeholder="4 days/week"
            {...register("liftingFrequency")}
          />
          <Input
            id="prog-length"
            label="Length (weeks)"
            type="number"
            min={1}
            placeholder="12"
            {...register("programLengthWeeks")}
          />
        </div>

        <Input
          id="prog-badge"
          label="Badge"
          placeholder="Gift"
          {...register("badge")}
        />

        {/* Auto-assign Sheet */}
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/10">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-100 dark:bg-indigo-900/40">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 text-indigo-600 dark:text-indigo-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                />
              </svg>
            </div>
            <label className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
              Auto-Assign Coaching Sheet
            </label>
          </div>
          <Input
            id="prog-auto-assign-sheet-id"
            label=""
            placeholder="Spreadsheet ID or URL — assigned on every new purchase…"
            className="font-mono text-xs"
            error={errors.autoAssignSheetId?.message}
            {...register("autoAssignSheetId")}
          />
          <p className="mt-1.5 text-xs text-indigo-700 dark:text-indigo-400">
            When set, every new paid purchase automatically links this
            spreadsheet to the buyer's account — if they don't already have one.
            Leave blank to assign sheets manually.
          </p>
        </div>

        {/* Highlights */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Highlights
            </label>
            <button
              type="button"
              onClick={() => highlightsArray.append({ value: "" })}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {highlightsArray.fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <input
                  {...register(`highlights.${index}.value`)}
                  placeholder="Bodybuilding-specific exercises"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
                {highlightsArray.fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => highlightsArray.remove(index)}
                    className="shrink-0 rounded p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <CheckboxField
              id="prog-active"
              label="Active (visible in shop)"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
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
