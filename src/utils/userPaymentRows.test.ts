import { describe, expect, it } from "vitest";
import { buildUserPaymentRows } from "./userPaymentRows";
import type { Purchase } from "@/types/user";

const coaching = (
  overrides: Partial<Extract<Purchase, { kind: "coaching_subscription" }>> = {},
): Purchase => ({
  kind: "coaching_subscription",
  id: "sub-1",
  planId: "plan-1",
  planName: "Ultra",
  planSlug: "ultra",
  status: "ACTIVE",
  totalAmount: 5000,
  currency: "INR",
  startDate: "2026-01-01",
  expiresAt: "2026-02-01",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("buildUserPaymentRows", () => {
  it("maps checkout statuses without inventing them", () => {
    const rows = buildUserPaymentRows(
      [
        {
          kind: "program_purchase",
          id: "p1",
          programId: "prog",
          programName: "Beginner",
          programSlug: "beginner",
          status: "FAILED",
          amount: 999,
          currency: "INR",
          paidAt: null,
          createdAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      [],
      new Set(),
    );
    expect(rows[0]?.status).toBe("Failed");
    expect(rows[0]?.productName).toBe("Beginner");
  });

  it("marks coaching pending only when the payment id is null", () => {
    const rows = buildUserPaymentRows(
      [coaching({ razorpayPaymentId: null })],
      [],
      new Set(),
    );
    expect(rows[0]?.status).toBe("Pending");
  });

  it("leaves status blank when the payment id field is absent", () => {
    const rows = buildUserPaymentRows([coaching()], [], new Set());
    expect(rows[0]?.status).toBeNull();
    expect(rows[0]?.statusNote).toMatch(/not included/i);
  });

  it("uses the renewals feed for overdue and keeps recorded manual payments", () => {
    const rows = buildUserPaymentRows(
      [coaching({ razorpayPaymentId: "pay_123" })],
      [
        {
          id: "adj-1",
          userId: "u1",
          subscriptionId: "sub-1",
          type: "MANUAL_PAYMENT",
          reason: "UPI",
          amount: 5000,
          daysAdded: null,
          periodStart: "2026-02-01",
          periodEnd: null,
          previousExpiresAt: null,
          newExpiresAt: null,
          createdByAdminId: null,
          createdAt: "2026-02-01T00:00:00.000Z",
        },
      ],
      new Set(["sub-1"]),
    );
    expect(rows.map((row) => row.status)).toEqual(["Paid", "Overdue"]);
  });
});
