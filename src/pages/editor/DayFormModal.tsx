import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
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
    isEdit ? updateMut.mutate(data) : createMut.mutate(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Day" : "Add Day"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
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
      </div>
    </div>
  );
}
