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
export const ProgramTemplatesPage = lazyPage(
  () => import("@/pages/ProgramTemplatesPage"),
  "ProgramTemplatesPage",
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
export const ClientErrorsPage = lazyPage(
  () => import("@/pages/ClientErrorsPage"),
  "ClientErrorsPage",
);
export const UploadFailuresPage = lazyPage(
  () => import("@/pages/UploadFailuresPage"),
  "UploadFailuresPage",
);
export const CouponsPage = lazyPage(
  () => import("@/pages/CouponsPage"),
  "CouponsPage",
);
export const CouponDetailPage = lazyPage(
  () => import("@/pages/CouponDetailPage"),
  "CouponDetailPage",
);
export const FormCheckInboxPage = lazyPage(
  () => import("@/pages/FormCheckInboxPage"),
  "FormCheckInboxPage",
);
export const WorkspacePage = lazyPage(
  () => import("@/pages/WorkspacePage"),
  "WorkspacePage",
);
export const CoachingRenewalsPage = lazyPage(
  () => import("@/pages/CoachingRenewalsPage"),
  "CoachingRenewalsPage",
);
export const ChatPage = lazyPage(() => import("@/pages/ChatPage"), "ChatPage");
export const AssistantCoachesPage = lazyPage(
  () => import("@/pages/AssistantCoachesPage"),
  "AssistantCoachesPage",
);
export const CoachAthletesPage = lazyPage(
  () => import("@/pages/CoachAthletesPage"),
  "CoachAthletesPage",
);
export const CoachAthletesLocationPage = lazyPage(
  () => import("@/pages/CoachAthletesLocationPage"),
  "CoachAthletesLocationPage",
);
export const CoachDashboardPage = lazyPage(
  () => import("@/pages/CoachDashboardPage"),
  "CoachDashboardPage",
);
export const CoachAthleteDetailPage = lazyPage(
  () => import("@/pages/CoachAthleteDetailPage"),
  "CoachAthleteDetailPage",
);
export const CoachOpsBoardPage = lazyPage(
  () => import("@/pages/CoachOpsBoardPage"),
  "CoachOpsBoardPage",
);
export const TestingPage = lazyPage(
  () => import("@/pages/TestingPage"),
  "TestingPage",
);
export const NotFoundPage = lazyPage(
  () => import("@/pages/NotFoundPage"),
  "NotFoundPage",
);
export const BigLiftPrPage = lazyPage(
  () => import("@/pages/BigLiftPrPage"),
  "BigLiftPrPage",
);
export const AnnouncementsPage = lazyPage(
  () => import("@/pages/AnnouncementsPage"),
  "AnnouncementsPage",
);
export const VideoLibraryPage = lazyPage(
  () => import("@/pages/VideoLibraryPage"),
  "VideoLibraryPage",
);
export const ProgramEditorPage = lazyPage(
  () => import("@/pages/ProgramEditorPage"),
  "ProgramEditorPage",
);
