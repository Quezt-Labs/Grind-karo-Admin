import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Athlete header — one-click copy for the formatted phone label shown in the UI.
 * Recording task: complete TODO 1 → 4 in order (see docs/COPY_PHONE_RECORDING_GUIDE.pdf).
 */

// TODO 1 — Add module constant COPIED_CONFIRMATION_MS (number, milliseconds).
//          Use the same duration as CopyEmailButton so "Copied" timing feels consistent (~2 seconds).

type CopyPhoneButtonProps = {
  /** Must match phoneStatus.label from UserDetailPage (formatted + prefix), not raw DB digits alone. */
  phone: string;
};

export function CopyPhoneButton({ phone }: CopyPhoneButtonProps) {
  // TODO 2 — copied feedback state
  //   • useState<boolean> for whether the button label reads "Copied"
  //   • useEffect on [copied]: when true, schedule reset after COPIED_CONFIRMATION_MS
  //   • cleanup: window.clearTimeout so navigation away does not leak timers

  // TODO 3 — copyPhone() async handler (no REST calls)
  //   • navigator.clipboard.writeText(phone) — the prop is already formatted for display
  //   • success → set copied true; clipboard deny/error → set copied false (no toast)

  // TODO 4 — Render UI (replace return null below)
  //   • ghost, sm, h-6 px-2 py-0 text-xs text-gray-600 dark:text-gray-300
  //   • onClick={() => void copyPhone()}
  //   • label: copied ? "Copied" : "Copy phone"

  return null;
}
