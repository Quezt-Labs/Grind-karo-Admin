import { FormModal } from "@/components/ui/FormModal";
import {
  ProgramWeekCompareContent,
  type WeekCompareSide,
} from "./ProgramWeekCompareContent";

interface ProgramWeekCompareModalProps {
  title: string;
  left: WeekCompareSide;
  right: WeekCompareSide;
  onClose: () => void;
}

export function ProgramWeekCompareModal({
  title,
  left,
  right,
  onClose,
}: ProgramWeekCompareModalProps) {
  return (
    <FormModal title={title} onClose={onClose} contentClassName="max-w-4xl">
      <ProgramWeekCompareContent left={left} right={right} />
    </FormModal>
  );
}
