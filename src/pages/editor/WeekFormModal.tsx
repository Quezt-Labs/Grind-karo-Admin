import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { FormModal } from "@/components/ui/FormModal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { programService } from "@/services/programService";
import type { Week } from "@/types/programs";
import {
  defaultWeekEnd,
  suggestNextWeekNumber,
  suggestNextWeekStart,
} from "@/utils/weekDates";

const schema = z
  .object({
    weekNumber: z.coerce.number().min(1),
    title: z.string().min(1),
    notes: z.string().optional(),
    weekStart: z.string().min(1, "Start date is required"),
    weekEnd: z.string().min(1, "End date is required"),
  })
  .refine((d) => d.weekEnd >= d.weekStart, {
    message: "End date must be on or after start date",
    path: ["weekEnd"],
  });

type FormData = z.infer<typeof schema>;

interface WeekFormModalProps {
  programId: string;
  blockId?: string;
  week?: Week;
  siblingWeeks?: Week[];
  onClose: () => void;
  onSuccess: () => void;
}

export function WeekFormModal({
  programId,
  blockId,
  week,
  siblingWeeks = [],
  onClose,
  onSuccess,
}: WeekFormModalProps) {
  const isEdit = !!week;
  const suggestedStart = suggestNextWeekStart(siblingWeeks);
  const suggestedNumber = suggestNextWeekNumber(siblingWeeks);
  const initialStart = week?.weekStart ?? suggestedStart ?? "";
  const initialEnd =
    week?.weekEnd ?? (initialStart ? defaultWeekEnd(initialStart) : "");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: week
      ? {
          weekNumber: week.weekNumber,
          title: week.title,
          notes: week.notes || "",
          weekStart: week.weekStart ?? "",
          weekEnd: week.weekEnd ?? "",
        }
      : {
          weekNumber: suggestedNumber,
          title: `WEEK ${suggestedNumber}`,
          notes: "",
          weekStart: initialStart,
          weekEnd: initialEnd,
        },
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      programService.createWeek(programId, blockId!, {
        ...d,
        notes: d.notes || null,
        weekStart: d.weekStart,
        weekEnd: d.weekEnd,
      }),
    onSuccess: () => {
      toast.success("Week created");
      onSuccess();
    },
  });
  const updateMut = useMutation({
    mutationFn: (d: FormData) =>
      programService.updateWeek(programId, week!.id, {
        ...d,
        notes: d.notes || null,
        weekStart: d.weekStart,
        weekEnd: d.weekEnd,
      }),
    onSuccess: () => {
      toast.success("Week updated");
      onSuccess();
    },
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  function onSubmit(data: FormData) {
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  }

  function handleWeekStartChange(e: React.ChangeEvent<HTMLInputElement>) {
    const start = e.target.value;
    if (start) {
      setValue("weekEnd", defaultWeekEnd(start), { shouldValidate: true });
    }
  }

  return (
    <FormModal
      title={isEdit ? "Edit Week" : "Add Week"}
      onClose={onClose}
      contentClassName="max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="week-num"
            label="Week Number"
            type="number"
            min={1}
            error={errors.weekNumber?.message}
            {...register("weekNumber")}
          />
          <Input
            id="week-title"
            label="Title"
            placeholder="WEEK 1"
            error={errors.title?.message}
            {...register("title")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="week-start"
            label="Week start"
            type="date"
            error={errors.weekStart?.message}
            {...register("weekStart", { onChange: handleWeekStartChange })}
          />
          <Input
            id="week-end"
            label="Week end"
            type="date"
            error={errors.weekEnd?.message}
            {...register("weekEnd")}
          />
        </div>
        <Textarea
          id="week-notes"
          label="Notes"
          rows={2}
          {...register("notes")}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
