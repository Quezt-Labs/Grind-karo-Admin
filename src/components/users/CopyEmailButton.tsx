import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const COPIED_CONFIRMATION_MS = 2000;

/**
 * Athlete header — one-click copy for the email address already shown in the UI.
 * Recording task: complete TODO 1 → 4 in order (see docs/COPY_EMAIL_RECORDING_GUIDE.pdf).
 */

// TODO 1 — Add module constant COPIED_CONFIRMATION_MS (number, milliseconds).
//          Pick a value so coaches can read "Copied" before the label resets (~2 seconds).


  /** Must match the email string rendered in UserDetailPage header. */

 interface CopyEmailButtonProps {
  email: string;
}

  // TODO 2 — copied feedback state
  
  //   • useState<boolean> for whether we are showing "Copied"
  //   • useEffect depends on [copied]: when true, start a single timeout (TODO 1 ms) then set copied false
  //   • effect cleanup must clear the timeout (avoid leaks if user navigates away)

  // TODO 3 — copyEmail() async handler (no API calls)
  export function CopyEmailButton({ email }: CopyEmailButtonProps) {
    const [copied, setCopied] = useState(false);
  useEffect(() => {
    if(!copied) return;
    if (copied) {
      const timer = window.setTimeout(() => setCopied(false), COPIED_CONFIRMATION_MS);
      return () => window.clearTimeout(timer);
    }
  }, [copied]);
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 px-2 py-0 text-xs text-gray-600 dark:text-gray-300"
      onClick={() => void copyEmail()}
    >
      {copied ? "Copied" : "Copy email"}
    </Button>
  );
  //   • navigator.clipboard.writeText(email)
  //   • success → set copied true
  //   • catch clipboard errors → set copied false (silent failure)

  // TODO 4 — Render UI (replace return null below)
  //   • <Button type="button" variant="ghost" size="sm">
  //   • className: h-6 px-2 py-0 text-xs text-gray-600 dark:text-gray-300
  //   • onClick={() => void copyEmail()}
  //   • children: copied ? "Copied" : "Copy email"

}

