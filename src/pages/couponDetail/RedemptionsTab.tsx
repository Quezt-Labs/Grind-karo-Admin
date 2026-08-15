import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { couponService } from "@/services/couponService";
import { useRedemptionColumns } from "./couponDetailHelpers";

interface RedemptionsTabProps {
  couponId: string;
}

export const RedemptionsTab = memo(function RedemptionsTab({
  couponId,
}: RedemptionsTabProps) {
  const {
    data: redemptions,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["coupon-redemptions", couponId],
    queryFn: () => couponService.getRedemptions(couponId),
  });

  const columns = useRedemptionColumns();

  if (isError) {
    return <ErrorAlert message="Failed to load redemptions." />;
  }

  return (
    <DataTable
      data={redemptions ?? []}
      columns={columns}
      isLoading={isLoading}
    />
  );
});
