import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const COPIED_CONFIRMATION_MS = 2000;

type CopyEmailButtonProps = {
  email: string;
};

export function CopyEmailButton({ email }: CopyEmailButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(
      () => setCopied(false),
      COPIED_CONFIRMATION_MS,
    );
    return () => window.clearTimeout(timer);
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
}
