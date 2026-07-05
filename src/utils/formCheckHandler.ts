export type FormCheckHandler = "assistant_coach" | "admin";

export type FormCheckHandlerInfo = {
  formCheckHandler: FormCheckHandler;
  formCheckCoachId?: string | null;
  formCheckCoachName?: string | null;
};

export function formCheckHandlerLabel(info: FormCheckHandlerInfo): string {
  if (info.formCheckHandler === "assistant_coach") {
    return info.formCheckCoachName?.trim() || "Assistant coach";
  }
  return "Admin";
}

export function formCheckHandlerDescription(
  info: FormCheckHandlerInfo,
): string {
  if (info.formCheckHandler === "assistant_coach") {
    return "Assistant coach handles form checks";
  }
  return "Admin handles form checks";
}
