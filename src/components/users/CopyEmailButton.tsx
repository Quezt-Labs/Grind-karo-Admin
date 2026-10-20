import {useState, useEffect} from "react";
import { Button } from "../ui/Button";

const COPIED_CONFIRMATION_MS = 2000;

interface CopyEmailButtonProps {
  email: string;
}

export const CopyEmailButton = ({email}: CopyEmailButtonProps) => {
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch (error) {
      console.error("Failed to copy email:", error);
    }
  };

  return (
    <Button
    type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopyEmail}
      className="h-6 px-2 py-0 text-xs text-gray-600 dark:text-gray-300"
    >
      {copied ? "Copied!" : "Copy Email"}
    </Button>
  );
};