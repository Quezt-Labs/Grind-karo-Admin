import { useQuery } from "@tanstack/react-query";
import { Users, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { programPurchaseService } from "@/services/programPurchaseService";

interface Props {
  programId: string;
}

function PurchaserRow({
  name,
  email,
  userId,
}: {
  name: string | null;
  email: string;
  userId: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
        {(name ?? email)[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {name ?? email.split("@")[0]}
        </p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {email}
        </p>
      </div>
      <Link
        to={`/users/${userId}`}
        className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        title="View user"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export function ProgramPurchasersPanel({ programId }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["program-purchasers", programId],
    queryFn: () => programPurchaseService.getAll({ programId, status: "PAID" }),
  });

  const purchases = data ?? [];
  const paidCount = purchases.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Purchasers
        </h2>
        {!isLoading && (
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            {paidCount}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-500">Failed to load purchasers.</p>
      )}

      {!isLoading && !isError && paidCount === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-8 text-center dark:border-gray-700 dark:bg-gray-800/40">
          <Users className="h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No paid purchasers yet.
          </p>
        </div>
      )}

      {!isLoading && paidCount > 0 && (
        <div className="space-y-2">
          {purchases.map((p) =>
            p.user ? (
              <PurchaserRow
                key={p.id}
                userId={p.user.id}
                name={p.user.name}
                email={p.user.email}
              />
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
