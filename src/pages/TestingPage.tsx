import { useState, useEffect, useCallback } from "react";
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  Search,
  ToggleLeft,
  ToggleRight,
  Info,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/utils/cn";

/* ─── Config ──────────────────────────────────────────────────────────── */

const SPREADSHEET_ID = "1XsnflVWTlDEsCFyZ31RU9m2jZHWiHiaK";
const DEFAULT_GID = "1471041050";

/**
 * In dev, requests go through Vite's proxy (/api/sheets/…) to bypass CORS.
 * In production, they hit Google directly (sheet must be publicly shared).
 */
function sheetExportUrl(sheetId: string, gid: string, format: "csv" | "xlsx") {
  const sheetPath = `/spreadsheets/d/${sheetId}/export?format=${format}&gid=${gid}`;
  if (import.meta.env.DEV) {
    return `/api/sheets${sheetPath}`;
  }
  return `https://docs.google.com${sheetPath}`;
}

function googleSheetsUrl(sheetId: string, gid: string) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit?gid=${gid}#gid=${gid}`;
}

/* ─── Types ───────────────────────────────────────────────────────────── */

interface SheetData {
  headers: string[];
  valueRows: string[][];
  formulaRows: string[][]; // formulas if present, otherwise same as value
  sheetNames: string[];
}

/* ─── XLSX Parser (extracts both values AND formulas) ─────────────────── */

function parseXLSX(buffer: ArrayBuffer, _gid: string): SheetData {
  const wb = XLSX.read(buffer, { type: "array", cellFormula: true });

  // Try to find the sheet matching the gid, fallback to first sheet
  // Google Sheets GIDs don't directly map to SheetJS names, so we use index or name
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  if (!ws) {
    return {
      headers: [],
      valueRows: [],
      formulaRows: [],
      sheetNames: wb.SheetNames,
    };
  }

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const headers: string[] = [];
  const valueRows: string[][] = [];
  const formulaRows: string[][] = [];

  // Extract headers from first row
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: range.s.r, c });
    const cell = ws[addr];
    headers.push(cell ? String(cell.v ?? "") : "");
  }

  // Extract data rows (both values and formulas)
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const valueRow: string[] = [];
    const formulaRow: string[] = [];

    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];

      if (cell) {
        // Value: formatted or raw
        valueRow.push(cell.w ?? String(cell.v ?? ""));
        // Formula: if cell has a formula, show it with "=" prefix
        formulaRow.push(
          cell.f ? `=${cell.f}` : (cell.w ?? String(cell.v ?? "")),
        );
      } else {
        valueRow.push("");
        formulaRow.push("");
      }
    }

    // Skip completely empty rows
    if (valueRow.some((v) => v.trim() !== "")) {
      valueRows.push(valueRow);
      formulaRows.push(formulaRow);
    }
  }

  return {
    headers,
    valueRows,
    formulaRows,
    sheetNames: wb.SheetNames,
  };
}

/* ─── Formula Stats ───────────────────────────────────────────────────── */

function countFormulas(rows: string[][]): {
  total: number;
  unique: string[];
  byFunction: Record<string, number>;
} {
  const allFormulas: string[] = [];
  const byFunction: Record<string, number> = {};

  for (const row of rows) {
    for (const cell of row) {
      if (cell.startsWith("=")) {
        allFormulas.push(cell);
        // Extract function name (e.g. =SUM(...) → SUM)
        const match = cell.match(/^=([A-Z]+)\(/i);
        if (match) {
          const fn = match[1].toUpperCase();
          byFunction[fn] = (byFunction[fn] || 0) + 1;
        }
      }
    }
  }

  const unique = [...new Set(allFormulas)];
  return { total: allFormulas.length, unique, byFunction };
}

/* ─── Page ────────────────────────────────────────────────────────────── */

export function TestingPage() {
  const [sheetId, setSheetId] = useState(SPREADSHEET_ID);
  const [gid, setGid] = useState(DEFAULT_GID);
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [showFormulas, setShowFormulas] = useState(false);
  const [showFormulaStats, setShowFormulaStats] = useState(false);

  const fetchSheet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch as XLSX to get both values AND formulas
      const url = sheetExportUrl(sheetId, gid, "xlsx");
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(
          `Failed to fetch sheet (${res.status}). Make sure the sheet is shared as "Anyone with the link".`,
        );
      }

      const contentType = res.headers.get("content-type") || "";

      // If we got HTML back, it's a login redirect
      if (contentType.includes("text/html")) {
        const text = await res.text();
        if (
          text.includes("ServiceLogin") ||
          text.includes("accounts.google.com")
        ) {
          throw new Error(
            'Sheet is not publicly accessible. Go to Google Sheets → Share → "Anyone with the link" → Viewer.',
          );
        }
        throw new Error("Unexpected HTML response. Sheet may not be shared.");
      }

      const buffer = await res.arrayBuffer();
      const parsed = parseXLSX(buffer, gid);
      setData(parsed);
      setLastFetched(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [sheetId, gid]);

  useEffect(() => {
    fetchSheet();
  }, [fetchSheet]);

  const headers = data?.headers ?? [];
  const rows = showFormulas
    ? (data?.formulaRows ?? [])
    : (data?.valueRows ?? []);

  // Filter rows by search
  const filteredRows = searchTerm
    ? rows.filter((row) =>
        row.some((cell) =>
          cell.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      )
    : rows;

  const formulaStats = data ? countFormulas(data.formulaRows) : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Testing — Google Sheet Viewer
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Live data from Google Sheets · Values + Formulas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={googleSheetsUrl(sheetId, gid)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in Sheets
          </a>
          <Button size="sm" onClick={fetchSheet} disabled={loading}>
            <RefreshCw
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            />{" "}
            Refresh
          </Button>
        </div>
      </div>

      {/* Config bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="min-w-[200px] flex-1">
          <Input
            id="sheet-id"
            label="Spreadsheet ID"
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
            placeholder="1XsnflVWTlDEsCFyZ31RU9m2jZHWiHiaK"
          />
        </div>
        <div className="w-36">
          <Input
            id="sheet-gid"
            label="Sheet GID"
            value={gid}
            onChange={(e) => setGid(e.target.value)}
            placeholder="1471041050"
          />
        </div>
        <Button onClick={fetchSheet} disabled={loading}>
          {loading ? "Loading..." : "Fetch"}
        </Button>
      </div>

      {/* Formula Stats Card */}
      {formulaStats && formulaStats.total > 0 && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                  {formulaStats.total} Formulas Found ·{" "}
                  {formulaStats.unique.length} Unique
                </p>
                <p className="mt-0.5 text-xs text-purple-600 dark:text-purple-300">
                  Functions:{" "}
                  {Object.entries(formulaStats.byFunction)
                    .sort((a, b) => b[1] - a[1])
                    .map(([fn, count]) => `${fn}(${count})`)
                    .join(", ") || "No named functions"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFormulaStats(!showFormulaStats)}
              className="text-xs font-medium text-purple-600 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-100"
            >
              {showFormulaStats ? "Hide All" : "Show All Formulas"}
            </button>
          </div>

          {showFormulaStats && (
            <div className="mt-3 max-h-60 overflow-y-auto rounded-md border border-purple-200 bg-white p-3 dark:border-purple-700 dark:bg-gray-800">
              <div className="space-y-1 font-mono text-xs">
                {formulaStats.unique.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="shrink-0 text-purple-400">{i + 1}.</span>
                    <span className="break-all text-gray-800 dark:text-gray-200">
                      {f}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search + toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search across all columns..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Formula toggle */}
          <button
            onClick={() => setShowFormulas(!showFormulas)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              showFormulas
                ? "border-purple-300 bg-purple-100 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
            )}
          >
            {showFormulas ? (
              <ToggleRight className="h-4 w-4" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
            {showFormulas ? "Formulas ON" : "Show Formulas"}
          </button>

          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {lastFetched && (
              <span>Fetched: {lastFetched.toLocaleTimeString()}</span>
            )}
            <span>
              {filteredRows.length}/{rows.length} rows
            </span>
            <span>{headers.length} cols</span>
          </div>
        </div>
      </div>

      {/* Hint */}
      {showFormulas && (
        <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>
            Purple cells contain formulas. Hover over them to see the computed
            value.
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      )}

      {/* Table */}
      {!loading && !error && headers.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-750">
                  <th className="sticky left-0 z-10 bg-gray-100 px-3 py-2.5 text-left text-xs font-bold text-gray-500 dark:bg-gray-750 dark:text-gray-400">
                    #
                  </th>
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold text-gray-600 dark:text-gray-300"
                    >
                      {h || `Col ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={headers.length + 1}
                      className="py-8 text-center text-gray-400"
                    >
                      {searchTerm
                        ? "No rows match your search"
                        : "No data rows found"}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, ri) => {
                    // Get corresponding value/formula rows for tooltip
                    const originalIdx = searchTerm ? rows.indexOf(row) : ri;
                    const valueRow = data?.valueRows[originalIdx];
                    const formulaRow = data?.formulaRows[originalIdx];

                    return (
                      <tr
                        key={ri}
                        className={cn(
                          "hover:bg-blue-50/50 dark:hover:bg-blue-900/10",
                          ri % 2 === 0
                            ? "bg-white dark:bg-gray-800"
                            : "bg-gray-50/50 dark:bg-gray-800/50",
                        )}
                      >
                        <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-xs font-medium text-gray-400">
                          {originalIdx + 1}
                        </td>
                        {headers.map((_, ci) => {
                          const cellValue = row[ci] ?? "";
                          const isFormula = cellValue.startsWith("=");
                          const computedValue = valueRow?.[ci] ?? "";
                          const formula = formulaRow?.[ci] ?? "";

                          return (
                            <td
                              key={ci}
                              className={cn(
                                "whitespace-nowrap px-3 py-2",
                                isFormula
                                  ? "bg-purple-50/50 font-mono text-purple-700 dark:bg-purple-900/10 dark:text-purple-300"
                                  : "text-gray-800 dark:text-gray-200",
                              )}
                              title={
                                showFormulas && isFormula
                                  ? `Value: ${computedValue}`
                                  : formula.startsWith("=")
                                    ? `Formula: ${formula}`
                                    : undefined
                              }
                            >
                              <CellValue
                                value={cellValue}
                                search={searchTerm}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && headers.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No data loaded. Enter a Spreadsheet ID and click Fetch.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Cell renderer ───────────────────────────────────────────────────── */

function CellValue({ value, search }: { value: string; search: string }) {
  if (!value)
    return <span className="text-gray-300 dark:text-gray-600">—</span>;

  // Highlight search matches
  if (search && value.toLowerCase().includes(search.toLowerCase())) {
    const idx = value.toLowerCase().indexOf(search.toLowerCase());
    const before = value.slice(0, idx);
    const match = value.slice(idx, idx + search.length);
    const after = value.slice(idx + search.length);
    return (
      <span>
        {before}
        <mark className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-700/50">
          {match}
        </mark>
        {after}
      </span>
    );
  }

  // Auto-detect URLs
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-600 hover:underline dark:text-primary-400"
      >
        {value.length > 50 ? value.slice(0, 50) + "…" : value}
      </a>
    );
  }

  return <>{value}</>;
}
