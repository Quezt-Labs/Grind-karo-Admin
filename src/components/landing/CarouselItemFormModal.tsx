import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ImageUploadField } from "@/components/shared/ImageUploadField";
import { landingPageService } from "@/services/landingPageService";
import type { CarouselItem } from "@/types/landingPage";

const schema = z.object({
  imageWebUrl: z.string().min(1, "Web image URL is required"),
  imageMobileUrl: z.string().min(1, "Mobile image URL is required"),
  alt: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  linkUrl: z.string().url().optional().or(z.literal("")),
  sortOrder: z.coerce.number().min(0),
});

type FormData = z.infer<typeof schema>;

interface CarouselItemFormModalProps {
  configId: string;
  item?: CarouselItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CarouselItemFormModal({
  configId,
  item,
  onClose,
  onSuccess,
}: CarouselItemFormModalProps) {
  const isEdit = !!item;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: item
      ? {
          imageWebUrl: item.imageWebUrl,
          imageMobileUrl: item.imageMobileUrl,
          alt: item.alt ?? "",
          title: item.title ?? "",
          subtitle: item.subtitle ?? "",
          linkUrl: item.linkUrl ?? "",
          sortOrder: item.sortOrder,
        }
      : {
          imageWebUrl: "",
          imageMobileUrl: "",
          alt: "",
          title: "",
          subtitle: "",
          linkUrl: "",
          sortOrder: 0,
        },
  });

  const imageWebUrl = watch("imageWebUrl");
  const imageMobileUrl = watch("imageMobileUrl");

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      landingPageService.createCarouselItem(configId, {
        imageWebUrl: d.imageWebUrl,
        imageMobileUrl: d.imageMobileUrl,
        alt: d.alt || null,
        title: d.title || null,
        subtitle: d.subtitle || null,
        linkUrl: d.linkUrl || null,
        sortOrder: d.sortOrder,
      }),
    onSuccess: () => {
      toast.success("Slide added");
      onSuccess();
    },
  });

  const updateMut = useMutation({
    mutationFn: (d: FormData) =>
      landingPageService.updateCarouselItem(configId, item!.id, {
        imageWebUrl: d.imageWebUrl,
        imageMobileUrl: d.imageMobileUrl,
        alt: d.alt || null,
        title: d.title || null,
        subtitle: d.subtitle || null,
        linkUrl: d.linkUrl || null,
        sortOrder: d.sortOrder,
      }),
    onSuccess: () => {
      toast.success("Slide updated");
      onSuccess();
    },
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  function onSubmit(data: FormData) {
    if (isEdit) updateMut.mutate(data);
    else createMut.mutate(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Carousel Slide" : "Add Carousel Slide"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Web image */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Web Image *
            </label>
            <ImageUploadField
              imageUrl={imageWebUrl || null}
              onImageChange={(url) => setValue("imageWebUrl", url ?? "")}
            />
            {errors.imageWebUrl && (
              <p className="mt-1 text-xs text-red-500">
                {errors.imageWebUrl.message}
              </p>
            )}
          </div>

          {/* Mobile image */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mobile Image *
            </label>
            <ImageUploadField
              imageUrl={imageMobileUrl || null}
              onImageChange={(url) => setValue("imageMobileUrl", url ?? "")}
            />
            {errors.imageMobileUrl && (
              <p className="mt-1 text-xs text-red-500">
                {errors.imageMobileUrl.message}
              </p>
            )}
          </div>

          <Input
            id="ci-alt"
            label="Alt Text"
            placeholder="Gorilla Strength program"
            {...register("alt")}
          />
          <Input
            id="ci-title"
            label="Title"
            placeholder="Gorilla Strength 2.0"
            {...register("title")}
          />
          <Input
            id="ci-subtitle"
            label="Subtitle"
            placeholder="Raw strength + muscle in 10 weeks"
            {...register("subtitle")}
          />
          <Input
            id="ci-link"
            label="Link URL"
            placeholder="https://www.grindkaro.in/shop/gorilla-strength"
            error={errors.linkUrl?.message}
            {...register("linkUrl")}
          />
          <Input
            id="ci-order"
            label="Sort Order"
            type="number"
            min={0}
            {...register("sortOrder")}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {isEdit ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
