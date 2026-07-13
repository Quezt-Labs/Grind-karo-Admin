import { isAxiosError } from "axios";

/** Best-effort message from Nest/Axios validation or conflict responses. */
export function apiErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
): string {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const data = error.response?.data as
    | { message?: string | string[]; error?: string }
    | undefined;

  if (Array.isArray(data?.message)) {
    return data.message.filter(Boolean).join(", ") || fallback;
  }
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }
  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error;
  }
  return error.message || fallback;
}
