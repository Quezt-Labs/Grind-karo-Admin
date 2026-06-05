import { lazy, type ComponentType } from "react";

function lazyPage<T extends ComponentType<unknown>>(
  importer: () => Promise<Record<string, T>>,
  exportName: string,
) {
  return lazy(() =>
    importer().then((module) => ({ default: module[exportName] })),
  );
}

export const DashboardPage = lazyPage(
  () => import("@/pages/DashboardPage"),
  "DashboardPage",
);
export const PlansPage = lazyPage(
  () => import("@/pages/PlansPage"),
  "PlansPage",
);
export const PlanDetailPage = lazyPage(
  () => import("@/pages/PlanDetailPage"),
  "PlanDetailPage",
);
export const AddonsPage = lazyPage(
  () => import("@/pages/AddonsPage"),
  "AddonsPage",
);
export const SubscriptionsPage = lazyPage(
  () => import("@/pages/EnrollmentsPage"),
  "SubscriptionsPage",
);
export const ReviewsPage = lazyPage(
  () => import("@/pages/ReviewsPage"),
  "ReviewsPage",
);
export const UsersPage = lazyPage(
  () => import("@/pages/UsersPage"),
  "UsersPage",
);
export const UserDetailPage = lazyPage(
  () => import("@/pages/UserDetailPage"),
  "UserDetailPage",
);
export const ExercisesPage = lazyPage(
  () => import("@/pages/ExercisesPage"),
  "ExercisesPage",
);
export const ProgramsPage = lazyPage(
  () => import("@/pages/ProgramsPage"),
  "ProgramsPage",
);
export const ProgramAddonsPage = lazyPage(
  () => import("@/pages/ProgramAddonsPage"),
  "ProgramAddonsPage",
);
export const ProgramDetailPage = lazyPage(
  () => import("@/pages/ProgramDetailPage"),
  "ProgramDetailPage",
);
export const ProgramBooksPage = lazyPage(
  () => import("@/pages/ProgramBooksPage"),
  "ProgramBooksPage",
);
export const ProgramPurchasesPage = lazyPage(
  () => import("@/pages/ProgramPurchasesPage"),
  "ProgramPurchasesPage",
);
export const ProgramReviewsPage = lazyPage(
  () => import("@/pages/ProgramReviewsPage"),
  "ProgramReviewsPage",
);
export const LandingPagesPage = lazyPage(
  () => import("@/pages/LandingPagesPage"),
  "LandingPagesPage",
);
export const LandingPageDetailPage = lazyPage(
  () => import("@/pages/LandingPageDetailPage"),
  "LandingPageDetailPage",
);
export const ContactSubmissionsPage = lazyPage(
  () => import("@/pages/ContactSubmissionsPage"),
  "ContactSubmissionsPage",
);
export const CouponsPage = lazyPage(
  () => import("@/pages/CouponsPage"),
  "CouponsPage",
);
export const CouponDetailPage = lazyPage(
  () => import("@/pages/CouponDetailPage"),
  "CouponDetailPage",
);
export const ChatPage = lazyPage(() => import("@/pages/ChatPage"), "ChatPage");
export const TestingPage = lazyPage(
  () => import("@/pages/TestingPage"),
  "TestingPage",
);
export const NotFoundPage = lazyPage(
  () => import("@/pages/NotFoundPage"),
  "NotFoundPage",
);
