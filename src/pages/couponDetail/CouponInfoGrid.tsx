import { memo } from "react";
import type { Coupon } from "@/types/coupon";
import { buildDetailFields } from "./couponDetailHelpers";

interface CouponInfoGridProps {
  coupon: Coupon;
}

export const CouponInfoGrid = memo(function CouponInfoGrid({
  coupon,
}: CouponInfoGridProps) {
  const fields = buildDetailFields(coupon);

  return (
    <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((f) => (
        <div key={f.label}>
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {f.label}
          </span>
          <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
            {f.value}
          </p>
        </div>
      ))}
    </div>
  );
});
