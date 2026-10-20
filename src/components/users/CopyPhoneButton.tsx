import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

// TODO 1: Define COPIED_CONFIRMATION_MS = 2000 (same duration as CopyEmailButton).

type CopyPhoneButtonProps = {
  phone: string;
};

export function CopyPhoneButton({ phone }: CopyPhoneButtonProps) {
  // TODO 2: const [copied, setCopied] = useState(false);
  //         useEffect: when copied is true, setTimeout to setCopied(false) after COPIED_CONFIRMATION_MS;
  //         return cleanup that clears the timer.

  // TODO 3: async function copyPhone() {
  //           try { await navigator.clipboard.writeText(phone); setCopied(true); }
  //           catch { setCopied(false); }
  //         }

  // TODO 4: return a ghost/sm size Button (match CopyEmailButton className) that calls copyPhone on click
  //         and shows "Copied" when copied, otherwise "Copy phone".

  return null;
}
