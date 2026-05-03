import { memo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Image,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CarouselItem } from "@/types/landingPage";

interface CarouselSectionProps {
  items: CarouselItem[];
  onAdd: () => void;
  onEdit: (item: CarouselItem) => void;
  onDelete: (item: CarouselItem) => void;
}

export const CarouselSection = memo(function CarouselSection({
  items,
  onAdd,
  onEdit,
  onDelete,
}: CarouselSectionProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Carousel Items ({items.length})
        </h2>
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Slide
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
          <Image className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No carousel slides yet. Add your first slide above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/50"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-gray-400" />

              <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white dark:border-gray-600 dark:bg-gray-800">
                {item.imageWebUrl ? (
                  <img
                    src={item.imageWebUrl}
                    alt={item.alt ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image className="h-5 w-5 text-gray-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {item.title || item.alt || `Slide ${item.sortOrder}`}
                </p>
                {item.subtitle && (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {item.subtitle}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-gray-400">
                  Order: {item.sortOrder}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {item.linkUrl && (
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Open link"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  onClick={() => onEdit(item)}
                  className="rounded p-1.5 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete(item)}
                  className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
