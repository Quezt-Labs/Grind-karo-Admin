import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Eye } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { DeleteUserButton } from "@/components/users/DeleteUserButton";
import { userColumns } from "./usersConstants";
import type { UserRow } from "./usersConstants";

type Props = {
  rows: UserRow[];
  isLoading: boolean;
  isError: boolean;
};

export const AllUsersSection = memo(function AllUsersSection({
  rows,
  isLoading,
  isError,
}: Props) {
  const navigate = useNavigate();

  const actionsColumn = {
    key: "id" as keyof UserRow & string,
    header: "Actions",
    render: (_: UserRow[keyof UserRow], row: UserRow) => (
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => navigate(`/users/${row.id}`)}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="View user"
        >
          <Eye className="h-4 w-4" />
        </button>
        <DeleteUserButton
          userId={row.id}
          userName={row.name === "—" ? null : row.name}
          userEmail={row.email}
          role={row.role}
          variant="icon"
        />
      </div>
    ),
  };

  if (isError) {
    return (
      <ErrorAlert message="Failed to load users. Please try again later." />
    );
  }

  if (!isLoading && rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
          <Users className="h-8 w-8 text-primary-500" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          No users found
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Users will appear here once people sign up.
        </p>
      </div>
    );
  }

  return (
    <DataTable
      data={rows}
      columns={[...userColumns, actionsColumn]}
      isLoading={isLoading}
    />
  );
});
