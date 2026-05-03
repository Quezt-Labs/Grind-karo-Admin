import { useNavigate } from "react-router-dom";
import type { Column } from "@/types/dashboard";
import type { Coupon, CouponRedemption } from "@/types/coupon";

export function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export type TabId = "whitelist" | "redemptions";

export function buildDetailFields(coupon: Coupon) {
  const discountLabel =
    coupon.discountType === "PERCENT"
      ? `${coupon.discountValue}%${coupon.maxDiscount ? ` (max ${formatINR(coupon.maxDiscount)})` : ""}`
      : formatINR(coupon.discountValue);

  return [
    { label: "Code", value: coupon.code },
    { label: "Discount", value: discountLabel },
    { label: "Scope", value: coupon.scope.replace("_", " ") },
    { label: "Apply to Add-ons", value: coupon.applyToAddons ? "Yes" : "No" },
    {
      label: "Min Order",
      value: coupon.minOrderAmount ? formatINR(coupon.minOrderAmount) : "—",
    },
    {
      label: "Max Redemptions",
      value: coupon.maxRedemptions?.toString() ?? "Unlimited",
    },
    {
      label: "Max / User",
      value: coupon.maxRedemptionsPerUser?.toString() ?? "Unlimited",
    },
    { label: "Total Used", value: coupon.totalRedemptions.toString() },
    {
      label: "Window",
      value:
        coupon.startsAt && coupon.expiresAt
          ? `${new Date(coupon.startsAt).toLocaleString()} – ${new Date(coupon.expiresAt).toLocaleString()}`
          : coupon.expiresAt
            ? `Until ${new Date(coupon.expiresAt).toLocaleString()}`
            : coupon.startsAt
              ? `From ${new Date(coupon.startsAt).toLocaleString()}`
              : "Always",
    },
    { label: "Created", value: new Date(coupon.createdAt).toLocaleString() },
  ];
}

export function useRedemptionColumns() {
  const navigate = useNavigate();

  const columns: Column<CouponRedemption>[] = [
    {
      key: "userId",
      header: "User",
      sortable: true,
      render: (v) => (
        <button
          className="text-primary-600 hover:underline dark:text-primary-400"
          onClick={() => navigate(`/users/${v}`)}
        >
          {(v as string).slice(0, 8)}…
        </button>
      ),
    },
    {
      key: "discountAmount",
      header: "Discount (₹)",
      sortable: true,
      render: (v) => formatINR(v as number),
    },
    {
      key: "programPurchaseId",
      header: "Purchase / Sub",
      render: (_, row) =>
        row.programPurchaseId
          ? `Purchase ${row.programPurchaseId.slice(0, 8)}…`
          : row.coachingSubscriptionId
            ? `Sub ${row.coachingSubscriptionId.slice(0, 8)}…`
            : "—",
    },
    {
      key: "createdAt",
      header: "Redeemed At",
      sortable: true,
      render: (v) => new Date(v as string).toLocaleString(),
    },
  ];

  return columns;
}
