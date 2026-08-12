import type { FormCheckThreadContextStatus } from "@/services/workoutVideoCommentService";

export type FormCheckThreadAccessTone = "deny" | "neutral" | "resolving";

export interface FormCheckThreadAccessStateInput {
  hasCommentId: boolean;
  hasVideoId: boolean;
  hasThreadType: boolean;
  resolving: boolean;
  resolutionStatus: FormCheckThreadContextStatus | null;
}

export interface FormCheckThreadAccessState {
  tone: FormCheckThreadAccessTone;
  message: string;
}

export function deriveFormCheckThreadAccessState(
  input: FormCheckThreadAccessStateInput,
): FormCheckThreadAccessState {
  const hasThreadIdentity = input.hasCommentId || input.hasVideoId;
  const hasIncompleteThreadContext = input.hasThreadType && !hasThreadIdentity;

  if (input.resolving) {
    return {
      tone: "resolving",
      message: "Resolving form-check thread context…",
    };
  }

  if (input.resolutionStatus === "forbidden") {
    return {
      tone: "deny",
      message:
        "You don’t have access to this form-check thread in your current scope. Ask an admin to update assignment if this athlete should be in your queue.",
    };
  }

  if (hasIncompleteThreadContext) {
    return {
      tone: "neutral",
      message:
        "This link has incomplete thread context. Select an athlete from the list or open the latest thread from notifications/action queue.",
    };
  }

  if (hasThreadIdentity) {
    if (input.resolutionStatus === "invalid_context") {
      return {
        tone: "neutral",
        message:
          "This form-check thread link is invalid or stale. Re-open the thread from the latest notification or action queue item.",
      };
    }
    if (input.resolutionStatus === "unavailable") {
      return {
        tone: "neutral",
        message:
          "Could not resolve this thread context right now. Please retry from notification/action queue.",
      };
    }
    return {
      tone: "neutral",
      message:
        "This thread context could not be matched to an athlete in your current list. Re-open from the latest notification or action queue.",
    };
  }

  return {
    tone: "neutral",
    message:
      "This athlete is not in the current filter or list. Clear filters or go back to athlete list to continue.",
  };
}
