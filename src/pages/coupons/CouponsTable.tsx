import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Trash2, Ticket } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { couponColumns } from "./couponsConstants";
import type { CouponRow } from "./couponsConstants";
import type { Column } from "@/types/dashboard";
import type { Coupon } from "@/types/coupon";

type Props = {
  rows: CouponRow[];
  couponMap: Map<string, Coupon>;
  isLoading: boolean;
  isError: boolean;
  onEdit: (coupon: Coupon) => void;
  onDelete: (coupon: Coupon) => void;
};

export const CouponsTable = memo(function CouponsTable({
  rows,
  couponMap,
  isLoading,
  isError,
  onEdit,
  onDelete,
}: Props) {
  const navigate = useNavigate();

  const actionsColumn: Column<CouponRow> = {
    key: "id",
    header: "Actions",
    render: (_value, row) => {
      const coupon = couponMap.get(row.id);
      if (!coupon) return null;
      return (
        <div className="flex gap-1">
          <button
            onClick={() => navigate(`/coupons/${coupon.id}`)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            title="View details & redemptions"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(coupon)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(coupon)}
            className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            title="Deactivate"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    },
  };

  if (isError) {
    return <ErrorAlert message="Failed to load coupons." />;
  }

  if (!isLoading && rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
          <Ticket className="h-8 w-8 text-primary-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          No coupons yet
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Create your first discount code to get started.
        </p>
      </div>
    );
  }

  return (
    <DataTable
      data={rows}
      columns={[...couponColumns, actionsColumn]}
      isLoading={isLoading}
    />
  );
});
