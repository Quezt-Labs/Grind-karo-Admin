import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { FormModal } from "@/components/ui/FormModal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { movementSlotService } from "@/services/movementSlotService";
import type { MovementSlot } from "@/types/programs";

const SLOT_CATEGORY_OPTIONS = [
  { value: "SQUAT", label: "Squat" },
  { value: "BENCH", label: "Bench" },
  { value: "DEADLIFT", label: "Deadlift" },
  { value: "ACCESSORY", label: "Accessory" },
  { value: "OTHER", label: "Other" },
];

const schema = z.object({
  slotKey: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "Lowercase with underscores only"),
  label: z.string().min(1),
  category: z.enum(["SQUAT", "BENCH", "DEADLIFT", "ACCESSORY", "OTHER"]),
  sortOrder: z.coerce.number().min(0),
});

type FormData = z.infer<typeof schema>;

interface SlotFormModalProps {
  programId: string;
  slot?: MovementSlot;
  onClose: () => void;
  onSuccess: () => void;
}

export function SlotFormModal({
  programId,
  slot,
  onClose,
  onSuccess,
}: SlotFormModalProps) {
  const isEdit = !!slot;
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: slot
      ? {
          slotKey: slot.slotKey,
          label: slot.label,
          category: slot.category,
          sortOrder: slot.sortOrder,
        }
      : { slotKey: "", label: "", category: "SQUAT", sortOrder: 0 },
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) => movementSlotService.createSlot(programId, d),
    onSuccess: () => {
      toast.success("Slot created");
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to create slot";
      toast.error(msg);
    },
  });

  const updateMut = useMutation({
    mutationFn: (d: FormData) => movementSlotService.updateSlot(slot!.id, d),
    onSuccess: () => {
      toast.success("Slot updated");
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
      title={isEdit ? "Edit Movement Slot" : "Create Movement Slot"}
      onClose={onClose}
      contentClassName="max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="slot-key"
          label="Slot Key"
          placeholder="squat_primary"
          error={errors.slotKey?.message}
          disabled={isEdit}
          {...register("slotKey")}
        />
        <Input
          id="slot-label"
          label="Label"
          placeholder="Primary Squat Movement"
          error={errors.label?.message}
          {...register("label")}
        />
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select
              id="slot-category"
              label="Category"
              options={SLOT_CATEGORY_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.category?.message}
            />
          )}
        />
        <Input
          id="slot-order"
          label="Sort Order"
          type="number"
          min={0}
          error={errors.sortOrder?.message}
          {...register("sortOrder")}
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
