import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ImageUploadField } from "@/components/shared/ImageUploadField";
import { VideoUploadField } from "@/components/shared/VideoUploadField";
import { landingPageService } from "@/services/landingPageService";
import type { LandingPageConfig } from "@/types/landingPage";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  heroBannerWebUrl: z.string().optional(),
  heroBannerMobileUrl: z.string().optional(),
  heroBannerAlt: z.string().optional(),
  heroBannerLinkUrl: z.string().url().optional().or(z.literal("")),
  heroVideoUrl: z.string().url().optional().or(z.literal("")),
  heroVideoPosterUrl: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface LandingPageFormModalProps {
  config: LandingPageConfig | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function LandingPageFormModal({
  config,
  onClose,
  onSuccess,
}: LandingPageFormModalProps) {
  const isEdit = !!config;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: config
      ? {
          name: config.name,
          title: config.title,
          subtitle: config.subtitle ?? "",
          heroBannerWebUrl: config.heroBannerWebUrl ?? "",
          heroBannerMobileUrl: config.heroBannerMobileUrl ?? "",
          heroBannerAlt: config.heroBannerAlt ?? "",
          heroBannerLinkUrl: config.heroBannerLinkUrl ?? "",
          heroVideoUrl: config.heroVideoUrl ?? "",
          heroVideoPosterUrl: config.heroVideoPosterUrl ?? "",
          ctaLabel: config.ctaLabel ?? "",
          ctaUrl: config.ctaUrl ?? "",
          isActive: config.isActive,
        }
      : {
          name: "",
          title: "",
          subtitle: "",
          heroBannerWebUrl: "",
          heroBannerMobileUrl: "",
          heroBannerAlt: "",
          heroBannerLinkUrl: "",
          heroVideoUrl: "",
          heroVideoPosterUrl: "",
          ctaLabel: "",
          ctaUrl: "",
          isActive: false,
        },
  });

  const heroBannerWebUrl = watch("heroBannerWebUrl");
  const heroBannerMobileUrl = watch("heroBannerMobileUrl");
  const heroVideoUrl = watch("heroVideoUrl");
  const heroVideoPosterUrl = watch("heroVideoPosterUrl");

  function toPayload(d: FormData) {
    return {
      name: d.name,
      title: d.title,
      subtitle: d.subtitle || null,
      heroBannerWebUrl: d.heroBannerWebUrl || null,
      heroBannerMobileUrl: d.heroBannerMobileUrl || null,
      heroBannerAlt: d.heroBannerAlt || null,
      heroBannerLinkUrl: d.heroBannerLinkUrl || null,
      heroVideoUrl: d.heroVideoUrl || null,
      heroVideoPosterUrl: d.heroVideoPosterUrl || null,
      ctaLabel: d.ctaLabel || null,
      ctaUrl: d.ctaUrl || null,
      isActive: d.isActive,
    };
  }

  const createMut = useMutation({
    mutationFn: (d: FormData) => landingPageService.create(toPayload(d)),
    onSuccess: () => {
      toast.success("Configuration created");
      onSuccess();
    },
  });

  const updateMut = useMutation({
    mutationFn: (d: FormData) =>
      landingPageService.update(config!.id, toPayload(d)),
    onSuccess: () => {
      toast.success("Configuration updated");
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
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Configuration" : "New Configuration"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Basic info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Basic Info
            </h3>
            <Input
              id="lp-name"
              label="Name *"
              placeholder="Diwali 2026 sale"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              id="lp-title"
              label="Title *"
              placeholder="The grind starts with a plan"
              error={errors.title?.message}
              {...register("title")}
            />
            <Textarea
              id="lp-subtitle"
              label="Subtitle"
              rows={2}
              placeholder="Pick yours. Built by powerlifters, for powerlifters."
              {...register("subtitle")}
            />
          </div>

          {/* Hero banner */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Hero Banner
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Web Banner
                </label>
                <ImageUploadField
                  imageUrl={heroBannerWebUrl || null}
                  onImageChange={(url) =>
                    setValue("heroBannerWebUrl", url ?? "")
                  }
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mobile Banner
                </label>
                <ImageUploadField
                  imageUrl={heroBannerMobileUrl || null}
                  onImageChange={(url) =>
                    setValue("heroBannerMobileUrl", url ?? "")
                  }
                />
              </div>
            </div>
            <Input
              id="lp-alt"
              label="Banner Alt Text"
              placeholder="Diwali strength sale"
              {...register("heroBannerAlt")}
            />
            <Input
              id="lp-banner-link"
              label="Banner Link URL"
              placeholder="https://www.grindkaro.in/shop"
              error={errors.heroBannerLinkUrl?.message}
              {...register("heroBannerLinkUrl")}
            />
          </div>

          {/* Hero video */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Hero Video
            </h3>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Video
              </label>
              <VideoUploadField
                videoUrl={heroVideoUrl || null}
                onVideoChange={(url) => setValue("heroVideoUrl", url ?? "")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Video Poster
              </label>
              <ImageUploadField
                imageUrl={heroVideoPosterUrl || null}
                onImageChange={(url) =>
                  setValue("heroVideoPosterUrl", url ?? "")
                }
              />
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Call to Action
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="lp-cta-label"
                label="CTA Label"
                placeholder="Shop programs"
                {...register("ctaLabel")}
              />
              <Input
                id="lp-cta-url"
                label="CTA URL"
                placeholder="https://www.grindkaro.in/shop"
                error={errors.ctaUrl?.message}
                {...register("ctaUrl")}
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="lp-active"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              {...register("isActive")}
            />
            <label
              htmlFor="lp-active"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Publish immediately (deactivates any other active configuration)
            </label>
          </div>

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
