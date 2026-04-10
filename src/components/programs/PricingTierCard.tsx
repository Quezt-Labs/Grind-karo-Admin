import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { UseFormRegister, FieldErrors } from "react-hook-form";

const tierOptions = [
  { value: "BASIC", label: "Basic" },
  { value: "PREMIUM", label: "Premium" },
  { value: "ELITE", label: "Elite" },
];

interface PricingTierCardProps {
  index: number;
  canRemove: boolean;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  onRemove: () => void;
}

export function PricingTierCard({
  index,
  canRemove,
  register,
  errors,
  onRemove,
}: PricingTierCardProps) {
  const tierErrors = (errors.pricingTiers as any)?.[index];

  return (
    <div className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-700/50">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Tier {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          id={`tier-${index}-type`}
          label="Type"
          options={tierOptions}
          error={tierErrors?.tier?.message}
          {...register(`pricingTiers.${index}.tier`)}
        />
        <Input
          id={`tier-${index}-price`}
          label="Price (paise)"
          type="number"
          min={0}
          placeholder="199900"
          error={tierErrors?.price?.message}
          {...register(`pricingTiers.${index}.price`)}
        />
        <Input
          id={`tier-${index}-validity`}
          label="Validity (days)"
          type="number"
          min={1}
          placeholder="90"
          error={tierErrors?.validityDays?.message}
          {...register(`pricingTiers.${index}.validityDays`)}
        />
        <Input
          id={`tier-${index}-total`}
          label="Total Value (paise)"
          type="number"
          min={0}
          placeholder="329900"
          {...register(`pricingTiers.${index}.totalValue`)}
        />
        <div className="sm:col-span-2">
          <Input
            id={`tier-${index}-features`}
            label="Features (JSON)"
            placeholder='{"programAccess":true,"videoLibrary":true}'
            {...register(`pricingTiers.${index}.features`)}
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            id={`tier-${index}-breakdown`}
            label="Value Breakdown (JSON)"
            placeholder='{"program":250000,"videoLibrary":50000}'
            {...register(`pricingTiers.${index}.valueBreakdown`)}
          />
        </div>
      </div>
    </div>
  );
}
