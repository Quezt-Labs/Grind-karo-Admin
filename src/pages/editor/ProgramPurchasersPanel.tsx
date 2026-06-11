import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Link2,
  Link2Off,
  ExternalLink,
  Loader2,
  Check,
  Pencil,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { programPurchaseService } from "@/services/programPurchaseService";
import type { ProgramPurchase } from "@/types/programs";

interface Props {
  programId: string;
}

interface UserSheetRowProps {
  purchase: ProgramPurchase;
  onSaved: () => void;
  onPatchSuccess: (updated: ProgramPurchase) => void;
}

function UserSheetRow({
  purchase,
  onSaved,
  onPatchSuccess,
}: UserSheetRowProps) {
  const user = purchase.user;
  const purchaseSheetId = purchase.spreadsheetId?.trim() || null;
  const legacyUserSheetId =
    !purchaseSheetId && user?.spreadsheetId?.trim()
      ? user.spreadsheetId.trim()
      : null;

  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const mutation = useMutation({
    mutationFn: (sheetId: string | null) =>
      programPurchaseService.patchSpreadsheetId(purchase.id, sheetId),
    onSuccess: (updated) => {
      toast.success(`Sheet updated for ${user?.name ?? user?.email ?? "user"}`);
      setEditing(false);
      onPatchSuccess(updated);
      onSaved();
    },
    onError: () => {
      toast.error("Failed to update sheet");
    },
  });

  if (!user) return null;

  const hasSheet = !!purchaseSheetId;

  function handleSave() {
    const trimmed = inputVal.trim();
    mutation.mutate(trimmed || null);
  }

  function handleUnlink() {
    mutation.mutate(null);
    setInputVal("");
  }

  // Extract spreadsheet ID from full Google Sheets URL if pasted
  function handleInputChange(val: string) {
    const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    setInputVal(match ? match[1] : val);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center">
      {/* Avatar + name/email */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
          {(user.name ?? user.email)[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
            {user.name ?? user.email.split("@")[0]}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {user.email}
          </p>
        </div>
      </div>

      {/* Sheet status / edit area */}
      <div className="flex shrink-0 items-center gap-2">
        {editing ? (
          <>
            <input
              autoFocus
              type="text"
              value={inputVal}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Spreadsheet ID or URL"
              className="w-60 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {mutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setInputVal(purchaseSheetId ?? "");
              }}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            {hasSheet ? (
              <>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Sheet linked
                </span>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${purchaseSheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 text-gray-400 hover:text-green-600"
                  title="Open sheet"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={() => {
                    setInputVal(purchaseSheetId ?? "");
                    setEditing(true);
                  }}
                  className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Change sheet"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleUnlink}
                  disabled={mutation.isPending}
                  className="rounded p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                  title="Unlink sheet"
                >
                  <Link2Off className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  No sheet
                </span>
                {legacyUserSheetId && (
                  <span
                    className="text-xs text-amber-600 dark:text-amber-400"
                    title={`Legacy user-level sheet: ${legacyUserSheetId}`}
                  >
                    User sheet linked
                  </span>
                )}
                <button
                  onClick={() => {
                    setInputVal("");
                    setEditing(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-indigo-300 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                >
                  <Link2 className="h-3 w-3" />
                  Link Sheet
                </button>
              </>
            )}
          </>
        )}

        {/* Always show profile link */}
        <Link
          to={`/users/${user.id}`}
          className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="View user"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function ProgramPurchasersPanel({ programId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["program-purchasers", programId];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => programPurchaseService.getAll({ programId, status: "PAID" }),
  });

  const purchases = data ?? [];
  const paidCount = purchases.length;

  function refetch() {
    queryClient.invalidateQueries({ queryKey });
  }

  function patchPurchaseInCache(updated: ProgramPurchase) {
    queryClient.setQueryData<ProgramPurchase[]>(queryKey, (old) =>
      old?.map((p) =>
        p.id === updated.id
          ? {
              ...p,
              ...updated,
              user: p.user ? { ...p.user, ...updated.user } : updated.user,
              program: p.program ?? updated.program,
            }
          : p,
      ),
    );
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
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
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Link their personal coaching spreadsheet here
        </p>
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
          {purchases.map((p) => (
            <UserSheetRow
              key={p.id}
              purchase={p}
              onSaved={refetch}
              onPatchSuccess={patchPurchaseInCache}
            />
          ))}
        </div>
      )}
    </div>
  );
}
