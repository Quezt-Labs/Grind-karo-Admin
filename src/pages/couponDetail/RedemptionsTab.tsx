import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/DataTable";
import { couponService } from "@/services/couponService";
import { useRedemptionColumns } from "./couponDetailHelpers";

interface RedemptionsTabProps {
  couponId: string;
}

export const RedemptionsTab = memo(function RedemptionsTab({
  couponId,
}: RedemptionsTabProps) {
  const { data: redemptions, isLoading } = useQuery({
    queryKey: ["coupon-redemptions", couponId],
    queryFn: () => couponService.getRedemptions(couponId),
  });

  const columns = useRedemptionColumns();

  return (
    <DataTable
      data={redemptions ?? []}
      columns={columns}
      isLoading={isLoading}
    />
  );
});
