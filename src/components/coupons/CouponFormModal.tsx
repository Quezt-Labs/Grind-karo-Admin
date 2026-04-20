import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { couponService } from "@/services/couponService";
import type { Coupon } from "@/types/coupon";

const DISCOUNT_TYPE_OPTIONS = [
  { value: "PERCENT", label: "Percentage" },
  { value: "FLAT", label: "Flat (₹)" },
];

const SCOPE_OPTIONS = [
  { value: "ALL", label: "All products" },
  { value: "PROGRAMS", label: "Programs only" },
  { value: "COACHING_PLANS", label: "Coaching plans only" },
  { value: "SPECIFIC", label: "Specific (whitelist)" },
];

const schema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(32)
      .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, _ and -"),
    description: z.string().optional(),
    discountType: z.enum(["PERCENT", "FLAT"]),
    discountValue: z.coerce.number().min(1),
    maxDiscount: z.coerce.number().nullable().optional(),
    minOrderAmount: z.coerce.number().nullable().optional(),
    scope: z.enum(["ALL", "PROGRAMS", "COACHING_PLANS", "SPECIFIC"]),
    applyToAddons: z.boolean(),
    maxRedemptions: z.coerce.number().nullable().optional(),
    maxRedemptionsPerUser: z.coerce.number().nullable().optional(),
    startsAt: z.string().optional(),
    expiresAt: z.string().optional(),
    isActive: z.boolean(),
  })
  .refine((d) => !(d.discountType === "PERCENT" && d.discountValue > 100), {
    message: "Percent discount cannot exceed 100",
    path: ["discountValue"],
  })
  .refine((d) => !(d.discountType === "FLAT" && d.maxDiscount), {
    message: "Max discount only applies to PERCENT type",
    path: ["maxDiscount"],
  });

type FormData = z.infer<typeof schema>;

interface CouponFormModalProps {
  coupon: Coupon | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CouponFormModal({
  coupon,
  onClose,
  onSuccess,
}: CouponFormModalProps) {
  const isEdit = !!coupon;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as unknown as Resolver<FormData>,
    defaultValues: coupon
      ? {
          code: coupon.code,
          description: coupon.description ?? "",
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          maxDiscount: coupon.maxDiscount,
          minOrderAmount: coupon.minOrderAmount,
          scope: coupon.scope,
          applyToAddons: coupon.applyToAddons,
          maxRedemptions: coupon.maxRedemptions,
          maxRedemptionsPerUser: coupon.maxRedemptionsPerUser,
          startsAt: coupon.startsAt ? coupon.startsAt.slice(0, 16) : "",
          expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : "",
          isActive: coupon.isActive,
        }
      : {
          code: "",
          description: "",
          discountType: "PERCENT",
          discountValue: 10,
          maxDiscount: null,
          minOrderAmount: null,
          scope: "ALL",
          applyToAddons: true,
          maxRedemptions: null,
          maxRedemptionsPerUser: 1,
          startsAt: "",
          expiresAt: "",
          isActive: true,
        },
  });

  function toPayload(d: FormData) {
    return {
      ...(!isEdit && { code: d.code }),
      description: d.description || null,
      discountType: d.discountType,
      discountValue: d.discountValue,
      maxDiscount: d.discountType === "PERCENT" ? d.maxDiscount || null : null,
      minOrderAmount: d.minOrderAmount || null,
      scope: d.scope,
      applyToAddons: d.applyToAddons,
      maxRedemptions: d.maxRedemptions || null,
      maxRedemptionsPerUser: d.maxRedemptionsPerUser ?? 1,
      startsAt: d.startsAt ? new Date(d.startsAt).toISOString() : null,
      expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : null,
      isActive: d.isActive,
    };
  }

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      couponService.create(
        toPayload(d) as Parameters<typeof couponService.create>[0],
      ),
    onSuccess: () => {
      toast.success("Coupon created");
      onSuccess();
    },
  });

  const updateMut = useMutation({
    mutationFn: (d: FormData) => couponService.update(coupon!.id, toPayload(d)),
    onSuccess: () => {
      toast.success("Coupon updated");
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
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Coupon" : "Create Coupon"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Code + Description */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="c-code"
              label="Code *"
              placeholder="DIWALI25"
              disabled={isEdit}
              error={errors.code?.message}
              {...register("code")}
            />
            <Select
              id="c-type"
              label="Discount Type"
              options={DISCOUNT_TYPE_OPTIONS}
              {...register("discountType")}
            />
          </div>
          <Textarea
            id="c-desc"
            label="Description"
            rows={2}
            placeholder="Diwali 2026 launch"
            {...register("description")}
          />

          {/* Discount values */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="c-value"
              label="Discount Value *"
              type="number"
              min={1}
              error={errors.discountValue?.message}
              {...register("discountValue")}
            />
            <Input
              id="c-max"
              label="Max Discount (₹)"
              type="number"
              min={0}
              placeholder="500"
              error={errors.maxDiscount?.message}
              {...register("maxDiscount")}
            />
            <Input
              id="c-min-order"
              label="Min Order (₹)"
              type="number"
              min={0}
              placeholder="999"
              {...register("minOrderAmount")}
            />
          </div>

          {/* Scope */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="c-scope"
              label="Scope"
              options={SCOPE_OPTIONS}
              {...register("scope")}
            />
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  {...register("applyToAddons")}
                />
                Apply to add-ons
              </label>
            </div>
          </div>

          {/* Guardrails */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="c-max-redeem"
              label="Max Redemptions (total)"
              type="number"
              min={0}
              placeholder="1000"
              {...register("maxRedemptions")}
            />
            <Input
              id="c-max-user"
              label="Max Per User"
              type="number"
              min={0}
              placeholder="1"
              {...register("maxRedemptionsPerUser")}
            />
          </div>

          {/* Time window */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="c-starts"
              label="Starts At"
              type="datetime-local"
              {...register("startsAt")}
            />
            <Input
              id="c-expires"
              label="Expires At"
              type="datetime-local"
              {...register("expiresAt")}
            />
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="c-active"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              {...register("isActive")}
            />
            <label
              htmlFor="c-active"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Active
            </label>
          </div>

          {isEdit && (
            <p className="text-xs text-gray-400">
              Code is immutable. To change the code, create a new coupon and
              deactivate this one.
            </p>
          )}

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
