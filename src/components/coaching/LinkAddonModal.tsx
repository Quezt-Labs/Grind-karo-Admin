import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { FormModal } from "@/components/ui/FormModal";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import type { CoachingAddon } from "@/types/program";

interface LinkAddonModalProps {
  availableAddons: CoachingAddon[];
  onLink: (addonId: string, priceOverride: number | null) => void;
  onClose: () => void;
  isLoading: boolean;
}

export function LinkAddonModal({
  availableAddons,
  onLink,
  onClose,
  isLoading,
}: LinkAddonModalProps) {
  const [selectedAddonId, setSelectedAddonId] = useState("");
  const [usePriceOverride, setUsePriceOverride] = useState(false);
  const [priceOverride, setPriceOverride] = useState<number>(0);

  const addonOptions = availableAddons.map((a) => ({
    value: a.id,
    label: `${a.name} (₹${a.price.toLocaleString("en-IN")})`,
  }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAddonId) return;
    onLink(selectedAddonId, usePriceOverride ? priceOverride : null);
  }

  return (
    <FormModal
      title="Link Add-on"
      onClose={onClose}
      contentClassName="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          id="addon-select"
          label="Add-on"
          options={addonOptions}
          value={selectedAddonId}
          onValueChange={setSelectedAddonId}
        />

        <CheckboxField
          id="addon-price-override"
          label="Override price for this plan"
          checked={usePriceOverride}
          onCheckedChange={setUsePriceOverride}
        />

        {usePriceOverride && (
          <Input
            id="price-override"
            label="Price Override (₹)"
            type="number"
            min={0}
            placeholder="799"
            value={priceOverride}
            onChange={(e) => setPriceOverride(Number(e.target.value))}
          />
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={!selectedAddonId}
          >
            Link Add-on
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
