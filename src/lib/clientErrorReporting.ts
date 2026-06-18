import axios from "axios";
import api from "@/services/api";

export type ClientErrorCategory = "API" | "REACT" | "UNHANDLED" | "PROMISE";

export type ReportClientErrorInput = {
  category: ClientErrorCategory;
  message: string;
  stack?: string;
  metadata?: Record<string, unknown>;
};

const REPORT_PATH = "/admin/client-errors/report";
const DEDUPE_MS = 5 * 60 * 1000;

function pageUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

function fingerprint(input: ReportClientErrorInput): string {
  return `${input.category}:${input.message.slice(0, 80)}:${pageUrl()}`;
}

function isDuplicateReport(key: string): boolean {
  try {
    const storageKey = `admin-error-report:${key}`;
    const last = sessionStorage.getItem(storageKey);
    if (last && Date.now() - Number(last) < DEDUPE_MS) return true;
    sessionStorage.setItem(storageKey, String(Date.now()));
  } catch {
    // private mode / SSR
  }
  return false;
}

export function shouldReportApiError(
  error: unknown,
  requestUrl?: string,
): boolean {
  if (axios.isCancel(error)) return false;
  if (
    requestUrl?.includes("/admin/client-errors") ||
    requestUrl?.includes("/client-events/")
  ) {
    return false;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 404) return false;
    if (status != null && status >= 500) return true;
    if (status != null && [400, 403, 409, 422, 429].includes(status)) {
      return true;
    }
    if (!error.response) return true;
    return false;
  }

  return false;
}

export function formatApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    const msg = data?.message;
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string" && msg.trim()) return msg;
    if (error.response?.status) {
      return `Request failed with status ${error.response.status}`;
    }
    if (error.code === "ECONNABORTED") return "Request timed out";
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Request failed";
}

export function reportClientError(input: ReportClientErrorInput): void {
  const message = input.message.trim().slice(0, 500);
  if (!message) return;

  const key = fingerprint({ ...input, message });
  if (isDuplicateReport(key)) return;

  void api
    .post(REPORT_PATH, {
      category: input.category,
      message,
      stack: input.stack?.slice(0, 8000),
      pageUrl: pageUrl(),
      metadata: input.metadata,
    })
    .catch(() => {
      // Reporting must never block the admin UI.
    });
}

export function initClientErrorReporting(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    if (event.defaultPrevented) return;
    reportClientError({
      category: "UNHANDLED",
      message: event.message || "Unhandled error",
      stack: event.error instanceof Error ? event.error.stack : undefined,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection";
    reportClientError({
      category: "PROMISE",
      message,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
