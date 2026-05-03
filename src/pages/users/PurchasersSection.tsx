import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Eye } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { purchaserColumns } from "./usersConstants";
import type { PurchaserRow } from "./usersConstants";

type Props = {
  rows: PurchaserRow[];
  isLoading: boolean;
  isError: boolean;
};

export const PurchasersSection = memo(function PurchasersSection({
  rows,
  isLoading,
  isError,
}: Props) {
  const navigate = useNavigate();

  const actionsColumn = {
    key: "id" as keyof PurchaserRow & string,
    header: "Actions",
    render: (value: PurchaserRow[keyof PurchaserRow]) => (
      <button
        onClick={() => navigate(`/users/${value}`)}
        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        title="View purchases"
      >
        <Eye className="h-4 w-4" />
      </button>
    ),
  };

  if (isError) {
    return (
      <ErrorAlert message="Failed to load purchasers. Please try again later." />
    );
  }

  if (!isLoading && rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
          <ShoppingCart className="h-8 w-8 text-primary-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          No purchasers yet
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Users who make a paid purchase will appear here.
        </p>
      </div>
    );
  }

  return (
    <DataTable
      data={rows}
      columns={[...purchaserColumns, actionsColumn]}
      isLoading={isLoading}
    />
  );
});
