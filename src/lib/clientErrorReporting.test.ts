import axios, { type AxiosError } from "axios";
import { describe, expect, it } from "vitest";
import {
  shouldReportApiError,
  shouldToastApiError,
} from "@/lib/clientErrorReporting";

function axiosError(status: number, url = "/admin/foo"): AxiosError {
  return {
    isAxiosError: true,
    name: "AxiosError",
    message: "Request failed",
    toJSON: () => ({}),
    response: {
      status,
      statusText: "Error",
      headers: {},
      config: {} as AxiosError["config"],
      data: { message: "Forbidden" },
    },
    config: { url } as AxiosError["config"],
  } as AxiosError;
}

describe("shouldReportApiError", () => {
  it("does not report 403 authorization failures", () => {
    expect(
      shouldReportApiError(axiosError(403), "/admin/athlete-assignments/1"),
    ).toBe(false);
  });

  it("does not report 404s", () => {
    expect(shouldReportApiError(axiosError(404), "/admin/users/missing")).toBe(
      false,
    );
  });

  it("reports 500s", () => {
    expect(
      shouldReportApiError(axiosError(500), "/admin/form-check/inbox"),
    ).toBe(true);
  });
});

describe("shouldToastApiError", () => {
  it("does not toast 403 so assistant coaches are not spammed", () => {
    expect(shouldToastApiError(axiosError(403))).toBe(false);
  });

  it("does not toast 404", () => {
    expect(shouldToastApiError(axiosError(404))).toBe(false);
  });

  it("toasts 500", () => {
    expect(shouldToastApiError(axiosError(500))).toBe(true);
  });

  it("does not toast cancelled requests", () => {
    const error = new axios.Cancel("aborted");
    expect(shouldToastApiError(error)).toBe(false);
  });
});
