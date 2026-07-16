import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { PollFormModal } from "@/components/polls/PollFormModal";
import { pollService } from "@/services/pollService";
import type { Poll } from "@/types/poll";

export function PollsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Poll | null>(null);

  const { data: polls, isLoading, isError } = useQuery({
    queryKey: ["polls"],
    queryFn: () => pollService.getAll(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => pollService.remove(id),
    onSuccess: () => {
      toast.success("Poll deleted");
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete poll"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Polls"
        description="Campaign polls with unique coupon rewards on vote / correct pick."
      >
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          New poll
        </Button>
      </PageHeader>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && (
        <p className="text-sm text-red-600">Failed to load polls.</p>
      )}

      {polls && polls.length === 0 && (
        <p className="text-sm text-gray-500">No polls yet.</p>
      )}

      {polls && polls.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Votes</th>
                <th className="px-4 py-3 font-medium">Rewards</th>
                <th className="px-4 py-3 font-medium">Closes</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {polls.map((poll) => (
                <tr
                  key={poll.id}
                  className="border-t border-gray-200 dark:border-gray-700"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/polls/${poll.id}`}
                      className="font-medium text-primary-600 hover:underline"
                    >
                      {poll.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{poll.slug}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={poll.status} />
                  </td>
                  <td className="px-4 py-3">{poll.totalVotes}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    P {poll.rewardCounts.participation} · W{" "}
                    {poll.rewardCounts.winner}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(poll.closesAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/polls/${poll.id}`)}
                    >
                      Open
                    </Button>
                    {poll.status === "DRAFT" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(poll)}
                      >
                        Delete
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <PollFormModal
          poll={null}
          onClose={() => setFormOpen(false)}
          onSuccess={(created) => {
            queryClient.invalidateQueries({ queryKey: ["polls"] });
            setFormOpen(false);
            navigate(`/polls/${created.id}`);
          }}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete draft poll?"
        message={`This will permanently delete "${deleteTarget?.title}".`}
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
