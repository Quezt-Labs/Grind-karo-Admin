import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Link Add-on
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            id="addon-select"
            label="Add-on"
            options={addonOptions}
            value={selectedAddonId}
            onChange={(e) => setSelectedAddonId(e.target.value)}
          />

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              checked={usePriceOverride}
              onChange={(e) => setUsePriceOverride(e.target.checked)}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Override price for this plan
            </span>
          </label>

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
      </div>
    </div>
  );
}
