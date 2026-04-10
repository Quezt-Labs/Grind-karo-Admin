const DotGrid = ({
  count,
  cols,
  size,
}: {
  count: number;
  cols: number;
  size: number;
}) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <circle
        key={i}
        cx={(i % cols) * size + size / 2}
        cy={Math.floor(i / cols) * size + size / 2}
        r="3"
      />
    ))}
  </>
);

function ConcentricRings({ rings }: { rings: number[] }) {
  return (
    <>
      {rings.map((r) => (
        <circle
          key={r}
          cx="50"
          cy="50"
          r={r}
          stroke="currentColor"
          strokeWidth="2"
        />
      ))}
    </>
  );
}

export function LoginBackground() {
  return (
    <>
      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.15]">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-gray-300 dark:text-gray-600"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary-500/15 blur-3xl dark:bg-primary-500/10" />
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-accent-500/15 blur-3xl dark:bg-accent-500/10" />
        <div className="absolute right-1/4 top-1/4 h-72 w-72 rounded-full bg-primary-300/10 blur-3xl dark:bg-primary-400/5" />
      </div>

      {/* Decorative SVG shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Dumbbell / fitness motif */}
        <svg
          className="absolute -right-6 -top-6 h-64 w-64 text-primary-500/10 dark:text-primary-400/5"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="60"
            cy="100"
            r="45"
            stroke="currentColor"
            strokeWidth="6"
          />
          <circle
            cx="140"
            cy="100"
            r="45"
            stroke="currentColor"
            strokeWidth="6"
          />
          <rect
            x="55"
            y="92"
            width="90"
            height="16"
            rx="4"
            fill="currentColor"
          />
          <rect
            x="20"
            y="88"
            width="30"
            height="24"
            rx="6"
            fill="currentColor"
          />
          <rect
            x="150"
            y="88"
            width="30"
            height="24"
            rx="6"
            fill="currentColor"
          />
        </svg>

        {/* Geometric triangles */}
        <svg
          className="absolute -bottom-10 -left-10 h-72 w-72 text-accent-500/10 dark:text-accent-400/5"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            points="100,10 190,150 10,150"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
          />
          <polygon
            points="100,40 170,140 30,140"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
          />
          <circle
            cx="100"
            cy="105"
            r="30"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
          />
        </svg>

        {/* Dot grids */}
        <svg
          className="absolute left-8 top-8 h-40 w-40 text-gray-400/20 dark:text-gray-500/10"
          viewBox="0 0 120 120"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <DotGrid count={25} cols={5} size={28} />
        </svg>

        <svg
          className="absolute bottom-12 right-12 h-32 w-32 text-gray-400/20 dark:text-gray-500/10"
          viewBox="0 0 120 120"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <DotGrid count={16} cols={4} size={32} />
        </svg>

        {/* Concentric rings */}
        <svg
          className="absolute left-1/4 top-16 h-24 w-24 text-primary-400/10 dark:text-primary-400/5"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ConcentricRings rings={[45, 30, 15]} />
        </svg>

        <svg
          className="absolute bottom-24 right-1/4 h-20 w-20 text-accent-400/10 dark:text-accent-400/5"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ConcentricRings rings={[45, 25]} />
        </svg>
      </div>
    </>
  );
}
