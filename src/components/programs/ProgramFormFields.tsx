import type {
  UseFormRegister,
  UseFieldArrayReturn,
  FieldErrors,
} from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { FormSection } from "@/components/ui/FormSection";
import { DynamicListField } from "@/components/programs/DynamicListField";
import { ImageUploadField } from "@/components/shared/ImageUploadField";
import { LEVEL_OPTIONS } from "@/utils/programFormSchema";
import type { ProgramFormData } from "@/utils/programFormSchema";

interface ProgramFormFieldsProps {
  register: UseFormRegister<ProgramFormData>;
  errors: FieldErrors<ProgramFormData>;
  highlightsArray: UseFieldArrayReturn<ProgramFormData, "highlights">;
  goalsArray: UseFieldArrayReturn<ProgramFormData, "goals">;
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
}

export function ProgramFormFields({
  register,
  errors,
  highlightsArray,
  goalsArray,
  imageUrl,
  onImageChange,
}: ProgramFormFieldsProps) {
  return (
    <>
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
        <ImageUploadField imageUrl={imageUrl} onImageChange={onImageChange} />
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
    </>
  );
}
