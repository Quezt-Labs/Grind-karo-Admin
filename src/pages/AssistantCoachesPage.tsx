import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/ShadTable";
import { assistantCoachService } from "@/services/athleteAssignmentService";

export function AssistantCoachesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const {
    data: coaches = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["assistant-coaches"],
    queryFn: () => assistantCoachService.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      assistantCoachService.create({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Assistant coach created");
      setEmail("");
      setName("");
      setPassword("");
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ["assistant-coaches"] });
    },
    onError: () => toast.error("Failed to create assistant coach"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assistant coaches"
        description="Create accounts for assistant coaches who manage assigned athletes."
      >
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Add assistant coach
        </Button>
      </PageHeader>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            New assistant coach
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coach@example.com"
            />
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rahul Sharma"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending || !email.trim() || password.length < 8
              }
            >
              Create account
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}
      {isError && <ErrorAlert message="Failed to load assistant coaches." />}

      {!isLoading && !isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50 dark:bg-gray-900/40">
              <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Name
                </TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Email
                </TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Assigned athletes
                </TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Created
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaches.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No assistant coaches yet.
                  </TableCell>
                </TableRow>
              ) : (
                coaches.map((coach) => (
                  <TableRow key={coach.id}>
                    <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {coach.name || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {coach.email}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm tabular-nums text-gray-600 dark:text-gray-300">
                      {coach.assignedAthleteCount}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500">
                      {new Date(coach.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
