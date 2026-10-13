import type { CoachingBillingAdjustment } from "@/services/coachingSubscriptionService";
import type { Purchase } from "@/types/user";

/** Statuses the admin UI is allowed to show. Never invent a status. */
export type UserPaymentStatus =
  | "Paid"
  | "Pending"
  | "Failed"
  | "Overdue"
  | "Refunded";

export interface UserPaymentRow {
  id: string;
  productName: string;
  amount: number | null;
  currency: string;
  date: string | null;
  status: UserPaymentStatus | null;
  /** Why status is blank, when the record does not carry a payment state. */
  statusNote: string | null;
  source: "purchase" | "manual_payment";
}

function checkoutStatus(
  status: "PENDING" | "PAID" | "FAILED" | "REFUNDED",
): UserPaymentStatus {
  if (status === "PAID") return "Paid";
  if (status === "PENDING") return "Pending";
  if (status === "FAILED") return "Failed";
  return "Refunded";
}

function coachingStatus(
  purchase: Extract<Purchase, { kind: "coaching_subscription" }>,
  overdueSubscriptionIds: ReadonlySet<string>,
): { status: UserPaymentStatus | null; statusNote: string | null } {
  if (overdueSubscriptionIds.has(purchase.id)) {
    return {
      status: "Overdue",
      statusNote: "Listed on the renewals overdue feed",
    };
  }
  if (purchase.razorpayPaymentId === null) {
    return {
      status: "Pending",
      statusNote: "Checkout has no captured payment id",
    };
  }
  if (typeof purchase.razorpayPaymentId === "string") {
    return { status: "Paid", statusNote: null };
  }
  return {
    status: null,
    statusNote: "Payment id was not included on this record",
  };
}

export function buildUserPaymentRows(
  purchases: Purchase[],
  adjustments: CoachingBillingAdjustment[],
  overdueSubscriptionIds: ReadonlySet<string>,
): UserPaymentRow[] {
  const fromPurchases: UserPaymentRow[] = purchases.map((purchase) => {
    if (purchase.kind === "coaching_subscription") {
      const mapped = coachingStatus(purchase, overdueSubscriptionIds);
      return {
        id: purchase.id,
        productName: purchase.planName,
        amount: purchase.totalAmount,
        currency: purchase.currency,
        date: purchase.startDate || purchase.createdAt,
        status: mapped.status,
        statusNote: mapped.statusNote,
        source: "purchase",
      };
    }
    return {
      id: purchase.id,
      productName:
        purchase.kind === "program_purchase"
          ? purchase.programName
          : purchase.bookName,
      amount: purchase.amount,
      currency: purchase.currency,
      date: purchase.paidAt ?? purchase.createdAt,
      status: checkoutStatus(purchase.status),
      statusNote: null,
      source: "purchase",
    };
  });

  const fromManual: UserPaymentRow[] = adjustments
    .filter((row) => row.type === "MANUAL_PAYMENT")
    .map((row) => ({
      id: row.id,
      productName: "Manual coaching payment",
      amount: row.amount,
      currency: "INR",
      date: row.periodStart ?? row.createdAt,
      status: "Paid" as const,
      statusNote: row.reason || null,
      source: "manual_payment" as const,
    }));

  return [...fromPurchases, ...fromManual].sort((a, b) => {
    const at = a.date ? new Date(a.date).getTime() : 0;
    const bt = b.date ? new Date(b.date).getTime() : 0;
    return bt - at;
  });
}
