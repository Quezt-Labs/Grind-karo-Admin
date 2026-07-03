import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { FormModal } from "@/components/ui/FormModal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { programService } from "@/services/programService";
import { programTemplateService } from "@/services/programTemplateService";
import type {
  CreateProgramTemplateFromSourcePayload,
  CreateProgramTemplatePayload,
} from "@/services/programTemplateService";

interface TemplateFormModalProps {
  onClose: () => void;
  onSuccess: (templateId: string) => void;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function TemplateFormModal({
  onClose,
  onSuccess,
}: TemplateFormModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [sourceProgramId, setSourceProgramId] = useState("");

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: programService.getAll,
  });

  const sourceOptions = programs.filter(
    (p) => p.kind === "RETAIL" || p.kind === "TEMPLATE" || p.kind == null,
  );

  const createMut = useMutation({
    mutationFn: (payload: CreateProgramTemplatePayload) =>
      sourceProgramId
        ? programTemplateService.createFromSource({
            ...payload,
            sourceProgramId,
          } satisfies CreateProgramTemplateFromSourcePayload)
        : programTemplateService.createBlank(payload),
    onSuccess: (template) => {
      toast.success("Template created");
      onSuccess(template.id);
    },
  });

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    if (!trimmedName || !trimmedSlug) {
      toast.error("Name and slug are required");
      return;
    }
    createMut.mutate({
      name: trimmedName,
      slug: trimmedSlug,
      description: description.trim() || null,
    });
  }

  return (
    <FormModal
      title="New program template"
      onClose={onClose}
      contentClassName="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="template-name"
          label="Template name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="MEGA — 12 Week Base"
          required
        />
        <Input
          id="template-slug"
          label="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="mega-12-week"
          required
        />
        <Textarea
          id="template-description"
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <Select
          id="template-source"
          label="Copy structure from (optional)"
          options={sourceOptions.map((p) => ({
            value: p.id,
            label: p.name,
          }))}
          value={sourceProgramId}
          onValueChange={setSourceProgramId}
          placeholder="Start blank"
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createMut.isPending}>
            Create template
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
