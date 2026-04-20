import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CreditCard,
  ShoppingBag,
  Calendar,
  Mail,
  User,
} from "lucide-react";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { userService } from "@/services/userService";
import { cn } from "@/utils/cn";
import type { Purchase } from "@/types/user";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-user-purchases", id],
    queryFn: () => userService.getPurchases(id!),
    enabled: !!id,
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const coaching = data.purchases.filter(
      (p) => p.kind === "coaching_subscription",
    );
    const programs = data.purchases.filter(
      (p) => p.kind === "program_purchase",
    );
    const totalSpent = data.purchases.reduce((sum, p) => {
      if (p.kind === "coaching_subscription") return sum + p.totalAmount;
      if (p.kind === "program_purchase" && p.status === "PAID")
        return sum + p.amount;
      return sum;
    }, 0);
    return {
      coachingCount: coaching.length,
      programCount: programs.length,
      totalSpent,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorAlert message="Failed to load user details." />;
  }

  const { user, purchases } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/users")}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {user.name || "Unnamed User"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {user.role}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Joined{" "}
              {formatDate(user.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<CreditCard className="h-5 w-5" />}
            label="Coaching Subscriptions"
            value={String(stats.coachingCount)}
          />
          <StatCard
            icon={<ShoppingBag className="h-5 w-5" />}
            label="Program Purchases"
            value={String(stats.programCount)}
          />
          <StatCard
            icon={<CreditCard className="h-5 w-5" />}
            label="Total Spent"
            value={formatINR(stats.totalSpent)}
          />
        </div>
      )}

      {/* Purchase Timeline */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Purchase History
        </h2>

        {purchases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No purchases yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => (
              <PurchaseCard key={purchase.id} purchase={purchase} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="rounded-lg bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function PurchaseCard({ purchase }: { purchase: Purchase }) {
  const isCoaching = purchase.kind === "coaching_subscription";

  return (
    <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 rounded-lg p-2",
              isCoaching
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
            )}
          >
            {isCoaching ? (
              <CreditCard className="h-4 w-4" />
            ) : (
              <ShoppingBag className="h-4 w-4" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {isCoaching ? purchase.planName : purchase.programName}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {isCoaching ? "Coaching Subscription" : "Program Purchase"} ·{" "}
              {formatDateTime(purchase.createdAt)}
            </p>
            {isCoaching && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formatDate(purchase.startDate)} →{" "}
                {formatDate(purchase.expiresAt)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={purchase.status} />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatINR(isCoaching ? purchase.totalAmount : purchase.amount)}
          </span>
        </div>
      </div>
    </div>
  );
}
