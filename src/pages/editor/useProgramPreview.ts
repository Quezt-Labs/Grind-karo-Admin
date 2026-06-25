import { useContext } from "react";
import { ProgramPreviewContext } from "./preview-context";

export function useProgramPreview() {
  return useContext(ProgramPreviewContext);
}
