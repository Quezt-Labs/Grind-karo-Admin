import { listWarmupChartEntries } from "@/utils/warmupChart";

/**
 * Read-only coach warmup chart for the program editor.
 * Athlete apps resolve steps from working load automatically.
 */
export function ProgramWarmupPanel() {
  const entries = listWarmupChartEntries();
  const sheetCount = entries.filter((e) => e.source === "sheet").length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Warmup chart
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Athlete workout screens look up warmups from the prescribed working
          load (RPE / %1RM / fixed kg on squat, bench, deadlift). No per-program
          setup needed — this is the shared coach chart.
        </p>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          {sheetCount} sheet rows · mid-range gaps (75–220 kg) generated in the
          same style
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2 font-medium">Load</th>
                <th className="px-3 py-2 font-medium">Warmup</th>
                <th className="px-3 py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {entries.map((row) => (
                <tr key={row.loadKg} className="bg-white dark:bg-gray-900">
                  <td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums text-gray-900 dark:text-white">
                    {row.loadKg} kg
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {row.steps.map((s) => s.text).join(" → ")}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-400">
                    {row.source === "sheet" ? "sheet" : "generated"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
