import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  MAX_CHART_REPS,
  RPE_VALUES,
  calculateLoad,
  estimateE1rm,
  getRpeChart,
  getRpeFactor,
  mround,
} from "@/utils/programFormulas";
import { cn } from "@/utils/cn";

const RPE_OPTIONS = RPE_VALUES.map((rpe) => ({
  value: String(rpe),
  label: `@${rpe} (RIR ${Number((10 - rpe).toFixed(1))})`,
}));

const REP_OPTIONS = Array.from({ length: MAX_CHART_REPS }, (_, i) => {
  const reps = i + 1;
  return { value: String(reps), label: String(reps) };
});

function formatPercent(factor: number): string {
  return `${(factor * 100).toFixed(1)}%`;
}

function cellTone(rpe: number, reps: number): string {
  if (rpe === 6) return "bg-red-500/90 text-white font-semibold";
  if (rpe >= 8 && reps <= 5) return "bg-amber-50 dark:bg-amber-950/40";
  if (rpe <= 5) return "bg-sky-50 dark:bg-sky-950/30";
  if (rpe >= 6.5 && rpe <= 7.5) return "bg-rose-50/80 dark:bg-rose-950/20";
  return "";
}

export function RpeCalculatorPage() {
  const chart = useMemo(() => getRpeChart(), []);

  const [mode, setMode] = useState<"load" | "e1rm">("load");
  const [rpe, setRpe] = useState("8");
  const [reps, setReps] = useState("5");
  const [oneRm, setOneRm] = useState("180");
  const [weight, setWeight] = useState("140");

  const rpeNum = parseFloat(rpe);
  const repsNum = parseInt(reps, 10);
  const factor = getRpeFactor(rpeNum, repsNum);

  const loadResult = useMemo(() => {
    const e1rm = parseFloat(oneRm);
    if (!factor || !Number.isFinite(e1rm) || e1rm <= 0) return null;
    return {
      percent: formatPercent(factor),
      load: calculateLoad(e1rm, factor, 2.5),
    };
  }, [factor, oneRm]);

  const e1rmResult = useMemo(() => {
    const w = parseFloat(weight);
    if (!Number.isFinite(w) || w <= 0) return null;
    const estimated = estimateE1rm(w, repsNum, rpeNum, 2.5);
    if (estimated == null || !factor) return null;
    return {
      percent: formatPercent(factor),
      e1rm: estimated,
      exact: mround(w / factor, 0.1),
    };
  }, [weight, repsNum, rpeNum, factor]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="RPE calculator"
        description="Coach RPE TABLE — %1RM from RPE × reps (RIR = 10 − RPE). Same chart as programming loads."
      />

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600/10">
              <Calculator className="h-4 w-4 text-primary-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Quick calc</h2>
              <p className="text-xs text-muted-foreground">
                Find load from 1RM, or estimate 1RM from a set
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "load" ? "primary" : "secondary"}
              onClick={() => setMode("load")}
            >
              Load from 1RM
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "e1rm" ? "primary" : "secondary"}
              onClick={() => setMode("e1rm")}
            >
              Estimate 1RM
            </Button>
          </div>

          <Select
            label="RPE"
            options={RPE_OPTIONS}
            value={rpe}
            onValueChange={setRpe}
          />
          <Select
            label="Reps"
            options={REP_OPTIONS}
            value={reps}
            onValueChange={setReps}
          />

          {mode === "load" ? (
            <Input
              label="1RM (kg)"
              type="number"
              inputMode="decimal"
              value={oneRm}
              onChange={(e) => setOneRm(e.target.value)}
            />
          ) : (
            <Input
              label="Weight lifted (kg)"
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          )}

          {factor == null ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              Outside chart range (RPE 1.5–10, reps 1–15).
            </p>
          ) : mode === "load" && loadResult ? (
            <div className="rounded-xl border border-primary-600/20 bg-primary-600/5 p-4">
              <p className="text-xs text-muted-foreground">Suggested load</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-primary-600">
                {loadResult.load}
                <span className="ml-1 text-lg font-semibold text-foreground/70">
                  kg
                </span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {reps} reps @{rpe} = {loadResult.percent} of 1RM
              </p>
            </div>
          ) : mode === "e1rm" && e1rmResult ? (
            <div className="rounded-xl border border-primary-600/20 bg-primary-600/5 p-4">
              <p className="text-xs text-muted-foreground">Estimated 1RM</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-primary-600">
                {e1rmResult.e1rm}
                <span className="ml-1 text-lg font-semibold text-foreground/70">
                  kg
                </span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {weight} kg × {reps} @{rpe} ({e1rmResult.percent})
              </p>
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">RPE TABLE</h2>
            <p className="text-xs text-muted-foreground">
              Values are % of 1RM. Red row = RPE 6 / RIR 4.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-max border-collapse text-xs">
              <thead>
                <tr className="bg-muted/40">
                  <th className="sticky left-0 z-20 bg-muted/80 px-2 py-2 text-left font-semibold">
                    RIR
                  </th>
                  <th className="sticky left-10 z-20 bg-muted/80 px-2 py-2 text-left font-semibold">
                    RPE
                  </th>
                  {Array.from({ length: MAX_CHART_REPS }, (_, i) => (
                    <th
                      key={i + 1}
                      className="px-2 py-2 text-center font-semibold tabular-nums"
                    >
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.map((row) => {
                  const rir = Number((10 - row.rpe).toFixed(1));
                  const isSelected = row.rpe === rpeNum;
                  return (
                    <tr key={row.rpe} className="border-t border-border/60">
                      <td
                        className={cn(
                          "sticky left-0 z-10 bg-card px-2 py-1.5 font-medium tabular-nums",
                          isSelected && "bg-primary-600/10",
                          row.rpe === 6 && "bg-red-500 text-white",
                        )}
                      >
                        {rir}
                      </td>
                      <td
                        className={cn(
                          "sticky left-10 z-10 bg-card px-2 py-1.5 font-semibold tabular-nums",
                          isSelected && "bg-primary-600/10",
                          row.rpe === 6 && "bg-red-500 text-white",
                        )}
                      >
                        {row.rpe}
                      </td>
                      {row.factors.map((factorValue, idx) => {
                        const repsAtCol = idx + 1;
                        const selected = isSelected && repsAtCol === repsNum;
                        return (
                          <td
                            key={repsAtCol}
                            className={cn(
                              "px-2 py-1.5 text-center tabular-nums",
                              cellTone(row.rpe, repsAtCol),
                              selected &&
                                "ring-2 ring-inset ring-primary-600 font-bold",
                            )}
                          >
                            {formatPercent(factorValue)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
