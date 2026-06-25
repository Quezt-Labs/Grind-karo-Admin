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
import type { Day } from "@/types/programs";

const schema = z.object({
  dayNumber: z.coerce.number().min(1),
  title: z.string().min(1),
  focus: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface DayFormModalProps {
  programId: string;
  weekId?: string;
  day?: Day;
  onClose: () => void;
  onSuccess: () => void;
}

export function DayFormModal({
  programId,
  weekId,
  day,
  onClose,
  onSuccess,
}: DayFormModalProps) {
  const isEdit = !!day;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: day
      ? {
          dayNumber: day.dayNumber,
          title: day.title,
          focus: day.focus || "",
          notes: day.notes || "",
        }
      : { dayNumber: 1, title: "DAY 1", focus: "", notes: "" },
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      programService.createDay(programId, weekId!, {
        ...d,
        focus: d.focus || null,
        notes: d.notes || null,
      }),
    onSuccess: () => {
      toast.success("Day created");
      onSuccess();
    },
  });
  const updateMut = useMutation({
    mutationFn: (d: FormData) =>
      programService.updateDay(programId, day!.id, {
        ...d,
        focus: d.focus || null,
        notes: d.notes || null,
      }),
    onSuccess: () => {
      toast.success("Day updated");
      onSuccess();
    },
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  function onSubmit(data: FormData) {
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  }

  return (
    <FormModal
      title={isEdit ? "Edit Day" : "Add Day"}
      onClose={onClose}
      contentClassName="max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="day-num"
            label="Day Number"
            type="number"
            min={1}
            error={errors.dayNumber?.message}
            {...register("dayNumber")}
          />
          <Input
            id="day-title"
            label="Title"
            placeholder="DAY 1"
            error={errors.title?.message}
            {...register("title")}
          />
        </div>
        <Input
          id="day-focus"
          label="Focus"
          placeholder="lower / upper / full body"
          {...register("focus")}
        />
        <Textarea
          id="day-notes"
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
