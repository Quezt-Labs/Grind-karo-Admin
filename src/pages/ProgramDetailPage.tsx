import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Pencil, CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { ProgramDetailSkeleton } from "@/components/ui/Shimmer";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { ProgramHeroBanner } from "@/components/programs/ProgramHeroBanner";
import { ProgramStatsRow } from "@/components/programs/ProgramStatsRow";
import { PlansSummaryCard } from "@/components/programs/PlansSummaryCard";
import { ProgramInfoCards } from "@/components/programs/ProgramInfoCards";
import { ProgramDangerZone } from "@/components/programs/ProgramDangerZone";
import { programService } from "@/services/programService";
import { planService } from "@/services/planService";

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const {
    data: program,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["program", id],
    queryFn: () => programService.getById(id!),
    enabled: !!id,
  });

  const { data: plans } = useQuery({
    queryKey: ["plans", id],
    queryFn: () => planService.getForProgram(id!),
    enabled: !!id,
  });

  const toggleMutation = useMutation({
    mutationFn: () =>
      programService.update(id!, { isActive: !program?.isActive }),
    onSuccess: () => {
      toast.success(
        program?.isActive ? "Program deactivated" : "Program activated",
      );
      queryClient.invalidateQueries({ queryKey: ["program", id] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => programService.remove(id!),
    onSuccess: () => {
      toast.success("Program deleted");
      navigate("/programs");
    },
    onError: () => toast.error("Failed to delete program"),
  });

  if (isLoading) {
    return <ProgramDetailSkeleton />;
  }

  if (isError || !program) {
    return <ErrorAlert message="Failed to load program details." />;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/programs")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Programs
      </button>

      <ProgramHeroBanner program={program} />

      <ProgramStatsRow program={program} />

      <div className="flex items-center gap-3">
        <Link to={`/programs/${program.id}/plans`}>
          <Button variant="secondary">
            <CreditCard className="h-4 w-4" />
            Manage Plans
          </Button>
        </Link>
        <Link to={`/programs/${program.id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4" />
            Edit Program
          </Button>
        </Link>
      </div>

      <PlansSummaryCard programId={program.id} plans={plans} />

      <ProgramInfoCards program={program} />

      <ProgramDangerZone
        program={program}
        isToggling={toggleMutation.isPending}
        onToggleStatus={() => toggleMutation.mutate()}
        onDelete={() => setShowDeleteModal(true)}
      />

      <ConfirmModal
        open={showDeleteModal}
        title="Delete Program"
        message={`Are you sure you want to delete "${program.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
