import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormSection";
import type {
  UseFieldArrayReturn,
  UseFormRegister,
  FieldValues,
} from "react-hook-form";

interface DynamicListFieldProps {
  title: string;
  fieldArray: UseFieldArrayReturn<FieldValues, string, "id">;
  register: UseFormRegister<FieldValues>;
  name: string;
  placeholder?: string;
}

export function DynamicListField({
  title,
  fieldArray,
  register,
  name,
  placeholder,
}: DynamicListFieldProps) {
  return (
    <FormSection
      title={title}
      action={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fieldArray.append({ value: "" })}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      }
    >
      <div className="space-y-2">
        {fieldArray.fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              placeholder={
                placeholder
                  ? `${placeholder} ${index + 1}`
                  : `Item ${index + 1}`
              }
              {...register(`${name}.${index}.value`)}
            />
            {fieldArray.fields.length > 1 && (
              <button
                type="button"
                onClick={() => fieldArray.remove(index)}
                className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </FormSection>
  );
}
