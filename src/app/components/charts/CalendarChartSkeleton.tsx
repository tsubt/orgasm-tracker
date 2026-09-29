const SQUARE_TONES = [
  "bg-pink-200 dark:bg-pink-900",
  "bg-pink-300 dark:bg-pink-800",
  "bg-pink-400 dark:bg-pink-700",
  "bg-pink-500 dark:bg-pink-600",
  "bg-green-200 dark:bg-green-900",
  "bg-green-300 dark:bg-green-800",
  "bg-blue-200 dark:bg-blue-900",
  "bg-blue-300 dark:bg-blue-800",
  "bg-blue-400 dark:bg-blue-700",
  "bg-gray-100 dark:bg-gray-800",
];

function squareTone(seed: number, index: number) {
  const n = (seed * 13 + index * 7) % 17;
  if (n > 8) return "bg-gray-100 dark:bg-gray-800";
  return SQUARE_TONES[n % SQUARE_TONES.length];
}

function MonthSkeleton({ seed }: { seed: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-8 rounded-full bg-pink-100 dark:bg-pink-900" />
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-4" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, index) => (
          <div
            key={index}
            className={`aspect-square rounded blur-[1px] motion-safe:animate-pulse ${squareTone(seed, index)}`}
            style={{ animationDelay: `${((seed + index) % 8) * 140}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function CalendarChartSkeleton() {
  return (
    <div className="w-full" aria-hidden="true">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-4 border-b border-gray-200 pb-4 dark:border-gray-700">
        <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="lg:hidden">
        <MonthSkeleton seed={0} />
      </div>
      <div className="hidden lg:grid lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: 12 }, (_, month) => (
          <MonthSkeleton key={month} seed={month + 1} />
        ))}
      </div>
    </div>
  );
}
