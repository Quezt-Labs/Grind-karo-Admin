import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { userService } from "@/services/userService";
import { planService } from "@/services/planService";
import { programService } from "@/services/programService";
import { assistantCoachService } from "@/services/athleteAssignmentService";
import {
  BULK_USER_CSV_TEMPLATE,
  downloadBulkUserTemplate,
  parseBulkUserInput,
  type BulkImportRowError,
} from "@/utils/bulkUserImport";
import type { BulkCreateUsersResponse } from "@/types/user";

type Props = {
  onClose: () => void;
};

type Format = "csv" | "json";

export function BulkAddUsersSection({ onClose }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [format, setFormat] = useState<Format>("csv");
  const [text, setText] = useState("");
  const [parseErrors, setParseErrors] = useState<BulkImportRowError[]>([]);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<BulkCreateUsersResponse | null>(
    null,
  );

  const { data: plans = [] } = useQuery({
    queryKey: ["coaching-plans"],
    queryFn: () => planService.getAll(),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["admin-programs"],
    queryFn: () => programService.getAll(),
  });

  const { data: coaches = [] } = useQuery({
    queryKey: ["assistant-coaches"],
    queryFn: () => assistantCoachService.list(),
  });

  const lookups = useMemo(
    () => ({ plans, programs, coaches }),
    [plans, programs, coaches],
  );

  const parsed = useMemo(() => {
    if (!text.trim()) {
      return { payloads: [], errors: [], parseError: undefined };
    }
    return parseBulkUserInput(text, format, lookups);
  }, [text, format, lookups]);

  const bulkMutation = useMutation({
    mutationFn: () => userService.createBulk(parsed.payloads),
    onSuccess: (result) => {
      setLastResult(result);
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-purchasers"] });
      void queryClient.invalidateQueries({ queryKey: ["assistant-coaches"] });
      if (result.failed === 0) {
        toast.success(`${result.succeeded} user(s) processed`);
      } else {
        toast.error(
          `${result.succeeded} succeeded, ${result.failed} failed — see details below`,
        );
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Bulk import failed");
    },
  });

  const handleValidate = () => {
    setLastResult(null);
    if (parsed.parseError) {
      setParseMessage(parsed.parseError);
      setParseErrors([]);
      return;
    }
    setParseMessage(null);
    setParseErrors(parsed.errors);
    if (parsed.payloads.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    if (parsed.errors.length > 0) {
      toast.error(
        `${parsed.errors.length} row(s) have errors — fix before import`,
      );
      return;
    }
    toast.success(`${parsed.payloads.length} row(s) ready to import`);
  };

  const handleImport = () => {
    setLastResult(null);
    if (parsed.parseError) {
      setParseMessage(parsed.parseError);
      return;
    }
    if (parsed.errors.length > 0) {
      setParseErrors(parsed.errors);
      toast.error("Fix row errors before importing");
      return;
    }
    if (parsed.payloads.length === 0) {
      toast.error("Nothing to import");
      return;
    }
    if (parsed.payloads.length > 100) {
      toast.error("Maximum 100 users per batch");
      return;
    }
    bulkMutation.mutate();
  };

  const handleFile = async (file: File) => {
    const content = await file.text();
    setText(content);
    setFormat(file.name.toLowerCase().endsWith(".json") ? "json" : "csv");
    setParseMessage(null);
    setParseErrors([]);
    setLastResult(null);
  };

  const canImport =
    parsed.payloads.length > 0 &&
    parsed.errors.length === 0 &&
    !parsed.parseError &&
    !bulkMutation.isPending;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
        Bulk add users
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Same rules as single add user — CSV or JSON. Use plan/program slugs and
        coach email for easy imports. Existing emails update and get new grants.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => downloadBulkUserTemplate()}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          CSV template
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Upload file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-600">
          {(["csv", "json"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`rounded-md px-3 py-1 text-xs font-medium uppercase ${
                format === f
                  ? "bg-indigo-600 text-white"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <textarea
        className="mt-3 min-h-[180px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        placeholder={
          format === "csv"
            ? "Paste CSV here or upload a file…"
            : '[{"email":"a@b.com","coaching_plan_slug":"mega"}]'
        }
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setParseMessage(null);
          setParseErrors([]);
          setLastResult(null);
        }}
      />

      <details className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
          Column reference (single add form se match)
        </summary>
        <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
          <p className="font-medium text-gray-700 dark:text-gray-300">Dates</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <code>coaching_start_date</code> → Add user mein{" "}
              <strong>Start date</strong> (coaching plan ke neeche)
            </li>
            <li>
              <code>coaching_end_date</code> → Add user mein{" "}
              <strong>End date</strong>
            </li>
            <li>
              <code>program_start_date</code> → Add user mein{" "}
              <strong>Program start date</strong>
            </li>
          </ul>
          <p>
            Format: YYYY-MM-DD (e.g. 2026-06-15). Khali chhodo to aaj ki date.
          </p>
        </div>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-2 dark:bg-gray-900">
          {BULK_USER_CSV_TEMPLATE.split("\n")[0]}
        </pre>
        <p className="mt-2">
          coaching_plan_slug / program_slug / assistant_coach_email — slug,
          name, ya UUID.
        </p>
      </details>

      {parseMessage && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {parseMessage}
        </p>
      )}

      {(parseErrors.length > 0 || parsed.errors.length > 0) && (
        <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-2 text-xs dark:border-red-900 dark:bg-red-950/40">
          {(parseErrors.length ? parseErrors : parsed.errors).map((err) => (
            <p
              key={`${err.row}-${err.message}`}
              className="text-red-700 dark:text-red-300"
            >
              Row {err.row}
              {err.email ? ` (${err.email})` : ""}: {err.message}
            </p>
          ))}
        </div>
      )}

      {text.trim() && !parseMessage && (
        <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
          {parsed.payloads.length} valid row(s)
          {parsed.errors.length > 0
            ? ` · ${parsed.errors.length} with errors`
            : ""}
        </p>
      )}

      {lastResult && (
        <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-2 text-xs dark:border-gray-600">
          <p className="font-medium text-gray-800 dark:text-gray-200">
            {lastResult.succeeded} succeeded · {lastResult.failed} failed
          </p>
          {lastResult.results.map((row) => (
            <p
              key={`${row.index}-${row.email}`}
              className={
                row.success
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }
            >
              {row.email}:{" "}
              {row.success ? (row.created ? "created" : "updated") : row.error}
            </p>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={handleValidate}>
          Validate
        </Button>
        <Button onClick={handleImport} disabled={!canImport}>
          {bulkMutation.isPending
            ? "Importing…"
            : `Import ${parsed.payloads.length || ""} user(s)`}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
