import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ExerciseTableRow,
  type ExerciseTableRowProps,
} from "./ExerciseTableRow";

interface SortableExerciseTableRowProps extends ExerciseTableRowProps {
  disabled?: boolean;
}

export function SortableExerciseTableRow({
  disabled = false,
  ...props
}: SortableExerciseTableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.row.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <ExerciseTableRow
      {...props}
      sortable={{
        setNodeRef,
        style,
        attributes,
        listeners,
        isDragging,
        disabled,
      }}
    />
  );
}
