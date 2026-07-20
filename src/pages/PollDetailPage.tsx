import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { PollFormModal } from "@/components/polls/PollFormModal";
import { pollService } from "@/services/pollService";

export function PollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [resolveOptionId, setResolveOptionId] = useState<string | null>(null);

  const {
    data: poll,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["poll", id],
    queryFn: () => pollService.getById(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["poll", id] });
    queryClient.invalidateQueries({ queryKey: ["polls"] });
  };

  const openMut = useMutation({
    mutationFn: () => pollService.open(id!),
    onSuccess: () => {
      toast.success("Poll opened");
      invalidate();
    },
    onError: () => toast.error("Failed to open poll"),
  });

  const closeMut = useMutation({
    mutationFn: () => pollService.close(id!),
    onSuccess: () => {
      toast.success("Voting ended");
      invalidate();
    },
    onError: () => toast.error("Failed to end voting"),
  });

  const revealMut = useMutation({
    mutationFn: () => pollService.revealResults(id!),
    onSuccess: () => {
      toast.success("Results public — participation coupon emails queued");
      invalidate();
    },
    onError: () => toast.error("Failed to show results"),
  });

  const resolveMut = useMutation({
    mutationFn: (winningOptionId: string) =>
      pollService.resolve(id!, winningOptionId),
    onSuccess: () => {
      toast.success("Winner set — claim emails queued to correct voters");
      setResolveOptionId(null);
      invalidate();
    },
    onError: () => toast.error("Failed to resolve poll"),
  });

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }
  if (isError || !poll) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">Failed to load poll.</p>
        <Button variant="secondary" onClick={() => navigate("/polls")}>
          Back
        </Button>
      </div>
    );
  }

  const resolveLabel =
    poll.options.find((o) => o.id === resolveOptionId)?.label ?? "option";

  return (
    <div className="space-y-6">
      <PageHeader
        title={poll.title}
        description={`/${poll.slug} · ${poll.totalVotes} votes · rewards P${poll.rewardCounts.participation} / W${poll.rewardCounts.winner}`}
      >
        <StatusBadge status={poll.status} />
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
        {(poll.status === "DRAFT" || poll.status === "CLOSED") && (
          <Button
            onClick={() => openMut.mutate()}
            isLoading={openMut.isPending}
          >
            Open voting
          </Button>
        )}
        {poll.status === "OPEN" && (
          <Button
            variant="secondary"
            onClick={() => closeMut.mutate()}
            isLoading={closeMut.isPending}
          >
            End voting
          </Button>
        )}
        {!poll.votingOpen &&
          poll.status !== "DRAFT" &&
          !poll.resultsVisible && (
            <Button
              onClick={() => revealMut.mutate()}
              isLoading={revealMut.isPending}
            >
              Show results
            </Button>
          )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-700">
          <p className="font-medium">Schedule</p>
          <p>Voting ends: {new Date(poll.closesAt).toLocaleString()}</p>
          <p>
            Public results:{" "}
            {poll.resultsVisible
              ? `shown ${poll.resultsRevealedAt ? new Date(poll.resultsRevealedAt).toLocaleString() : ""}`
              : "hidden — use Show results"}
          </p>
          {poll.resolvedAt && (
            <p>Resolved: {new Date(poll.resolvedAt).toLocaleString()}</p>
          )}
        </div>
        <div className="space-y-1 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-700">
          <p className="font-medium">Reward templates</p>
          <p>
            Participation: {poll.participationDiscountValue}% · applicable on{" "}
            {poll.participationScope === "PROGRAMS"
              ? "programs"
              : poll.participationScope === "COACHING_PLANS"
                ? "coaching"
                : "programs + coaching"}
          </p>
          <p>
            Winner: {poll.winnerDiscountValue}% · applicable on{" "}
            {poll.winnerScope === "PROGRAMS"
              ? "programs"
              : poll.winnerScope === "COACHING_PLANS"
                ? "coaching"
                : "programs + coaching"}
          </p>
          <p className="text-xs text-gray-500">
            {poll.bindRewardsToVoter ? "Voter-bound" : "Anyone with code"} ·{" "}
            {poll.revealCodesAfterClose
              ? "Code when results declared"
              : "Code on vote"}
          </p>
        </div>
      </div>

      {poll.heroImageUrl && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Hero background</p>
          <img
            src={poll.heroImageUrl}
            alt=""
            className="h-40 w-full max-w-xl rounded-lg border object-cover dark:border-gray-700"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 font-medium">Option</th>
              <th className="px-4 py-3 font-medium">Votes</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {poll.options.map((opt) => (
              <tr
                key={opt.id}
                className="border-t border-gray-200 dark:border-gray-700"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {opt.imageUrl ? (
                      <img
                        src={opt.imageUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[10px] text-gray-400 dark:bg-gray-800">
                        No photo
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      {opt.subtitle && (
                        <div className="text-xs text-gray-500">
                          {opt.subtitle}
                        </div>
                      )}
                      {poll.winningOptionId === opt.id && (
                        <div className="mt-1 text-xs font-medium text-primary-600">
                          Winner
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{opt.voteCount}</td>
                <td className="px-4 py-3">
                  {!poll.votingOpen &&
                    (poll.status === "CLOSED" || poll.status === "OPEN") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setResolveOptionId(opt.id)}
                      >
                        Set as winner
                      </Button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link to="/polls" className="text-sm text-primary-600 hover:underline">
        ← Back to polls
      </Link>

      {editOpen && (
        <PollFormModal
          poll={poll}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
            invalidate();
          }}
        />
      )}

      <ConfirmModal
        open={!!resolveOptionId}
        title="Resolve poll?"
        message={`Mark "${resolveLabel}" as the winner? Correct voters get an email to claim the winner coupon.`}
        confirmLabel="Resolve"
        variant="primary"
        onConfirm={() => resolveOptionId && resolveMut.mutate(resolveOptionId)}
        onCancel={() => setResolveOptionId(null)}
        isLoading={resolveMut.isPending}
      />
    </div>
  );
}
