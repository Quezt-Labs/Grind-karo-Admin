import { ClipboardList } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import type { UserInfo } from "@/types/user";

function formatEnum(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
        {value}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/30">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
        {title}
      </h3>
      <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

type Props = {
  intake: UserInfo | undefined;
  isLoading: boolean;
  isMissing: boolean;
};

export function CoachingIntakePanel({ intake, isLoading, isMissing }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ClipboardList className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Coaching intake
        </h2>
        {intake && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Submitted {formatDateTime(intake.createdAt)}
            {intake.updatedAt !== intake.createdAt &&
              ` · Updated ${formatDateTime(intake.updatedAt)}`}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isMissing || !intake ? (
        <div className="rounded-lg border border-dashed border-orange-300 bg-orange-50 px-4 py-8 text-center dark:border-orange-700 dark:bg-orange-900/20">
          <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
            Intake not submitted yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-orange-800/90 dark:text-orange-300/90">
            The athlete hasn&apos;t completed the coaching intake form in the
            app. Answers will appear here once they submit it.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Section title="Personal info">
            <Field label="Full name" value={intake.name} />
            <Field label="Age" value={intake.age} />
            <Field label="Height" value={intake.height} />
            <Field
              label="Bodyweight & goal"
              value={intake.currentBodyweightAndGoal}
            />
            <Field label="City" value={intake.city} />
            <Field label="WhatsApp" value={intake.whatsappNumber} />
            <Field label="Instagram" value={intake.instagramId} />
          </Section>

          <Section title="Training">
            <Field
              label="Experience"
              value={intake.resistanceTrainingExperience}
            />
            <Field label="Time per session" value={intake.timePerSession} />
            <Field
              label="Competition level"
              value={formatEnum(intake.competitionLevel)}
            />
            <Field label="Squat max" value={intake.squatMax} />
            <Field label="Squat style" value={formatEnum(intake.squatStyle)} />
            <Field label="Bench max" value={intake.benchMax} />
            <Field
              label="Bench grip"
              value={formatEnum(intake.benchGripWidth)}
            />
            <Field label="Deadlift max" value={intake.deadliftMax} />
            <Field
              label="Deadlift style"
              value={formatEnum(intake.deadliftStyle)}
            />
            <Field label="Pull-ups & dips" value={intake.pullUpsDips} />
            <Field label="Training split" value={intake.trainingSplit} />
            <Field
              label="Lift training style"
              value={intake.liftTrainingStyle}
            />
            <Field
              label="1.25 kg plates"
              value={intake.has125kgPlate ? "Yes" : "No"}
            />
            <Field label="Training dislikes" value={intake.trainingDislikes} />
          </Section>

          <Section title="Lifestyle">
            <Field
              label="Smoke / drink"
              value={formatEnum(intake.smokeDrink)}
            />
            <Field
              label="Used PEDs"
              value={intake.hasUsedPEDs ? "Yes" : "No"}
            />
            <Field
              label="Calories & macros"
              value={intake.caloriesMacrosDescription}
            />
            <Field
              label="Diet quality"
              value={formatEnum(intake.dietQuality)}
            />
            <Field
              label="Physically demanding job"
              value={intake.physicallyDemandingJob ? "Yes" : "No"}
            />
            <Field label="Sleep" value={formatEnum(intake.sleepHours)} />
            <Field
              label="Recovery ability"
              value={formatEnum(intake.recoveryAbility)}
            />
            <Field label="Injuries" value={intake.injuries} />
          </Section>

          <Section title="Goals & coaching">
            <Field
              label="Coaching goals"
              value={intake.coachingGoal.map(formatEnum).join(", ")}
            />
            <Field
              label="Training days / week"
              value={formatEnum(intake.trainingDaysPerWeek)}
            />
            <Field
              label="Communication frequency"
              value={formatEnum(intake.communicationFrequency)}
            />
            <Field label="RPE experience" value={intake.rpeExperience} />
            <Field label="Past programs" value={intake.pastPrograms} />
            <Field
              label="Perceived weaknesses"
              value={intake.perceivedWeaknesses}
            />
          </Section>

          <Section title="Mindset">
            <Field
              label="Worked with coach before"
              value={intake.hasWorkedWithCoach ? "Yes" : "No"}
            />
            <Field
              label="Commitment level"
              value={formatEnum(intake.commitmentLevel)}
            />
            <Field
              label="Training approach"
              value={formatEnum(intake.trainingApproach)}
            />
            <Field label="Ideal coach" value={intake.idealCoach} />
            <Field label="Goals" value={intake.shortAndLongTermGoals} />
            <Field label="Anything else" value={intake.anythingElse} />
            <Field
              label="Referral sources"
              value={intake.referralSources.map(formatEnum).join(", ")}
            />
          </Section>
        </div>
      )}
    </div>
  );
}
