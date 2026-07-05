import { cn } from "@/utils/cn";
import {
  formCheckHandlerDescription,
  formCheckHandlerLabel,
  type FormCheckHandlerInfo,
} from "@/utils/formCheckHandler";

type Props = FormCheckHandlerInfo & {
  className?: string;
  size?: "sm" | "md";
};

export function FormCheckHandlerBadge({
  formCheckHandler,
  formCheckCoachName,
  className,
  size = "sm",
}: Props) {
  const label = formCheckHandlerLabel({
    formCheckHandler,
    formCheckCoachName,
  });
  const isAssistant = formCheckHandler === "assistant_coach";

  return (
    <span
      title={formCheckHandlerDescription({
        formCheckHandler,
        formCheckCoachName,
      })}
      className={cn(
        "inline-flex items-center rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        isAssistant
          ? "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        className,
      )}
    >
      {label}
    </span>
  );
}
