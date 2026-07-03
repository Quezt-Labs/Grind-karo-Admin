import type { CoachingPlan } from "@/types/program";
import type { Program } from "@/types/programs";
import type { AssistantCoach } from "@/types/athleteAssignment";
import type { CreateAdminUserPayload } from "@/types/user";
import { planGrantsFormCheck } from "@/utils/coachingPlanCapabilities";
import {
  addMonthsToDateInput,
  defaultFeeCoversMonths,
  todayDateInput,
} from "@/utils/coachingBilling";

export type BulkImportLookups = {
  plans: CoachingPlan[];
  programs: Program[];
  coaches: AssistantCoach[];
};

export type BulkImportRowError = {
  row: number;
  email?: string;
  message: string;
};

export type BulkImportParseResult = {
  payloads: CreateAdminUserPayload[];
  errors: BulkImportRowError[];
};

export const BULK_USER_CSV_TEMPLATE = `email,name,role,password,coaching_plan_slug,coaching_amount,coaching_fee_months,coaching_start_date,coaching_end_date,program_slug,program_amount,program_start_date,assistant_coach_email,personal_coaching,form_check_enabled
athlete@example.com,Rahul Sharma,USER,,mega,14999,3,2026-06-01,2026-09-01,,,,coach@example.com,true,true`;

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value == null || value.trim() === "") return undefined;
  const v = value.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(v)) return true;
  if (["false", "0", "no", "n"].includes(v)) return false;
  return undefined;
}

function parseFeeMonths(value: string | undefined): 1 | 3 | undefined {
  if (!value?.trim()) return undefined;
  const n = Number.parseInt(value.trim(), 10);
  return n === 1 || n === 3 ? n : undefined;
}

function toIsoStart(date: string | undefined): string | undefined {
  if (!date?.trim()) return undefined;
  return new Date(`${date.trim()}T00:00:00`).toISOString();
}

function toIsoEnd(date: string | undefined): string | undefined {
  if (!date?.trim()) return undefined;
  return new Date(`${date.trim()}T23:59:59`).toISOString();
}

/** Minimal RFC-style CSV parser (quoted fields + commas). */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  if (nonEmpty.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = parseLine(nonEmpty[0]!).map(normalizeKey);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < nonEmpty.length; i++) {
    const cells = parseLine(nonEmpty[i]!);
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c];
      if (key) row[key] = cells[c] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

function rowValue(
  row: Record<string, string>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const v = row[normalizeKey(key)];
    if (v != null && v.trim() !== "") return v.trim();
  }
  return undefined;
}

function findPlan(
  lookups: BulkImportLookups,
  slugOrId: string | undefined,
): CoachingPlan | undefined {
  if (!slugOrId) return undefined;
  const key = slugOrId.trim().toLowerCase();
  return lookups.plans.find(
    (p) =>
      p.id === slugOrId ||
      p.slug.toLowerCase() === key ||
      p.name.toLowerCase() === key,
  );
}

function findProgram(
  lookups: BulkImportLookups,
  slugOrId: string | undefined,
): Program | undefined {
  if (!slugOrId) return undefined;
  const key = slugOrId.trim().toLowerCase();
  return lookups.programs.find(
    (p) =>
      p.id === slugOrId ||
      p.slug.toLowerCase() === key ||
      p.name.toLowerCase() === key,
  );
}

function findCoach(
  lookups: BulkImportLookups,
  emailOrId: string | undefined,
): AssistantCoach | undefined {
  if (!emailOrId) return undefined;
  const key = emailOrId.trim().toLowerCase();
  return lookups.coaches.find(
    (c) => c.id === emailOrId || c.email.toLowerCase() === key,
  );
}

function mapRowToPayload(
  row: Record<string, string>,
  lookups: BulkImportLookups,
): { payload?: CreateAdminUserPayload; error?: string } {
  const email = rowValue(row, "email");
  if (!email) {
    return { error: "email is required" };
  }

  const roleRaw = (rowValue(row, "role") ?? "USER").toUpperCase();
  if (roleRaw !== "USER" && roleRaw !== "ASSISTANT_COACH") {
    return { error: `invalid role "${roleRaw}"` };
  }
  const role = roleRaw as CreateAdminUserPayload["role"];

  const password = rowValue(row, "password");
  if (role === "ASSISTANT_COACH" && (!password || password.length < 8)) {
    return { error: "password min 8 chars required for ASSISTANT_COACH" };
  }

  const payload: CreateAdminUserPayload = {
    email,
    name: rowValue(row, "name"),
    role,
    password: role === "ASSISTANT_COACH" ? password : undefined,
  };

  if (role !== "USER") {
    return { payload };
  }

  const planRef =
    rowValue(row, "coaching_plan_slug", "coaching_plan_id", "coaching_plan") ??
    rowValue(row, "plan_slug", "plan_id");
  const plan = findPlan(lookups, planRef);
  if (planRef && !plan) {
    return { error: `coaching plan not found: ${planRef}` };
  }

  if (plan) {
    const feeMonths =
      parseFeeMonths(
        rowValue(row, "coaching_fee_months", "fee_covers_months"),
      ) ?? defaultFeeCoversMonths(plan);
    const startDate =
      rowValue(row, "coaching_start_date", "coaching_start") ??
      todayDateInput();
    const endDate =
      rowValue(row, "coaching_end_date", "coaching_end") ??
      addMonthsToDateInput(startDate, feeMonths);
    const amountRaw = rowValue(row, "coaching_amount", "coaching_price");
    const amount = amountRaw ? Number(amountRaw) : undefined;
    if (amountRaw && (!Number.isFinite(amount) || (amount ?? 0) <= 0)) {
      return { error: "invalid coaching_amount" };
    }

    payload.coaching = {
      planId: plan.id,
      totalAmount: amount,
      feeCoversMonths: feeMonths,
      startDate: toIsoStart(startDate),
      expiresAt: toIsoEnd(endDate),
    };
  }

  const programRef =
    rowValue(row, "program_slug", "program_id", "program") ?? undefined;
  const program = findProgram(lookups, programRef);
  if (programRef && !program) {
    return { error: `program not found: ${programRef}` };
  }

  if (program) {
    const amountRaw = rowValue(row, "program_amount", "program_price");
    const amount = amountRaw ? Number(amountRaw) : undefined;
    if (amountRaw && (!Number.isFinite(amount) || (amount ?? 0) <= 0)) {
      return { error: "invalid program_amount" };
    }
    const startDate =
      rowValue(row, "program_start_date", "program_start") ?? todayDateInput();

    payload.program = {
      programId: program.id,
      amount,
      startDate: toIsoStart(startDate),
    };
  }

  const coachRef =
    rowValue(
      row,
      "assistant_coach_email",
      "assistant_coach_id",
      "coach_email",
      "coach_id",
    ) ?? undefined;
  const coach = findCoach(lookups, coachRef);
  if (coachRef && !coach) {
    return { error: `assistant coach not found: ${coachRef}` };
  }

  if (coach) {
    const personal = parseBool(rowValue(row, "personal_coaching"));
    const formCheck = parseBool(
      rowValue(row, "form_check_enabled", "form_check"),
    );
    const defaultFormCheck = plan ? planGrantsFormCheck(plan.slug) : false;
    payload.assignment = {
      assistantCoachId: coach.id,
      personalCoachingEnabled: personal ?? true,
      formCheckEnabled: formCheck ?? defaultFormCheck,
    };
  }

  return { payload };
}

export function mapBulkRowsToPayloads(
  rows: Record<string, string>[],
  lookups: BulkImportLookups,
): BulkImportParseResult {
  const payloads: CreateAdminUserPayload[] = [];
  const errors: BulkImportRowError[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const { payload, error } = mapRowToPayload(row, lookups);
    if (error) {
      errors.push({
        row: rowNumber,
        email: rowValue(row, "email"),
        message: error,
      });
      return;
    }
    if (payload) payloads.push(payload);
  });

  return { payloads, errors };
}

export function parseBulkUserJson(
  text: string,
): Record<string, string>[] | { error: string } {
  try {
    const parsed = JSON.parse(text) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          "users" in parsed &&
          Array.isArray((parsed as { users: unknown }).users)
        ? (parsed as { users: unknown[] }).users
        : null;

    if (!list) {
      return { error: "JSON must be an array or { users: [...] }" };
    }

    return list.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new Error(`Row ${index + 1} is not an object`);
      }
      const row: Record<string, string> = {};
      for (const [key, value] of Object.entries(item)) {
        if (value == null) continue;
        row[normalizeKey(key)] = String(value);
      }
      return row;
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Invalid JSON",
    };
  }
}

export function parseBulkUserInput(
  text: string,
  format: "csv" | "json",
  lookups: BulkImportLookups,
): BulkImportParseResult & { parseError?: string } {
  if (format === "json") {
    const parsed = parseBulkUserJson(text);
    if ("error" in parsed) {
      return { payloads: [], errors: [], parseError: parsed.error };
    }
    return mapBulkRowsToPayloads(parsed, lookups);
  }

  const rows = parseCsv(text);
  if (rows.length === 0) {
    return {
      payloads: [],
      errors: [],
      parseError: "CSV needs a header row and at least one data row",
    };
  }
  return mapBulkRowsToPayloads(rows, lookups);
}

export function downloadBulkUserTemplate(): void {
  const blob = new Blob([BULK_USER_CSV_TEMPLATE], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bulk-users-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
