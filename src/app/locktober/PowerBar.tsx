import { barFillPercent, TierSnapshot } from "@/lib/locktober/scoring";

function tierTone(tier: TierSnapshot, tiers: TierSnapshot[]) {
  const ruined = tiers
    .filter((item) => item.orgasmType === "RUINED")
    .sort((a, b) => a.points - b.points);
  const firstRuined = ruined[0];
  if (
    tier.orgasmType === "RUINED" &&
    firstRuined &&
    firstRuined.points === tier.points &&
    firstRuined.label === tier.label
  ) {
    return {
      text: "text-cyan-700 dark:text-cyan-400",
      mark: "bg-cyan-600 dark:bg-cyan-400",
    };
  }
  if (tier.orgasmType === "RUINED") {
    return {
      text: "text-rose-600 dark:text-rose-400",
      mark: "bg-rose-500 dark:bg-rose-400",
    };
  }
  if (tier.orgasmType === "FULL" && !tier.expectsLocked) {
    return {
      text: "text-teal-700 dark:text-teal-400",
      mark: "bg-teal-600 dark:bg-teal-400",
    };
  }
  if (tier.orgasmType === "FULL") {
    return {
      text: "text-rose-600 dark:text-rose-500",
      mark: "bg-rose-600 dark:bg-rose-500",
    };
  }
  return {
    text: "text-amber-700 dark:text-amber-400",
    mark: "bg-amber-500 dark:bg-amber-400",
  };
}

export default function PowerBar({
  points,
  tiers,
  locked,
  daysLeft = null,
  compact = false,
}: {
  points: number;
  tiers: TierSnapshot[];
  locked: boolean;
  daysLeft?: number | null;
  compact?: boolean;
}) {
  const fill = barFillPercent(points, tiers);
  const sorted = [...tiers].sort((a, b) => a.points - b.points);
  const daysLabel =
    daysLeft == null
      ? null
      : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`;

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white text-gray-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white ${compact ? "p-3" : "p-5"}`}
    >
      {!compact && (
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold tracking-wide text-rose-600 dark:text-rose-400">
            LOCKTOBER POWER BAR
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Earn points through tasks and challenges
          </p>
        </div>
      )}

      <div className={`relative ${compact ? "h-10" : "h-36"}`}>
        <div className={`relative h-full ${compact ? "" : "ml-10 mr-24"}`}>
          {!compact &&
            sorted.map((tier, index) => {
              const left = barFillPercent(tier.points, tiers);
              const tone = tierTone(tier, tiers);
              return (
                <div
                  key={`${tier.label}-${tier.points}`}
                  className={`absolute hidden -translate-x-1/2 whitespace-nowrap text-center sm:block ${
                    index % 2 === 0 ? "top-0" : "top-4"
                  }`}
                  style={{ left: `${left}%` }}
                >
                  <div
                    className={`text-[10px] font-semibold uppercase leading-tight ${tone.text}`}
                  >
                    {tier.label}
                  </div>
                </div>
              );
            })}

          <div
            className={`absolute left-0 right-0 ${compact ? "top-1 h-6" : "top-12 h-8"}`}
          >
            <div className="relative h-full overflow-hidden rounded-full border border-gray-300 bg-gray-100 dark:border-slate-700 dark:bg-slate-900">
              <div
                className="h-full rounded-full bg-rose-500"
                style={{ width: `${fill}%` }}
              />
              <div className="pointer-events-none absolute inset-y-1 left-1 right-1 rounded-full bg-white/25 dark:bg-white/10" />
            </div>
            {sorted.map((tier) => {
              const left = barFillPercent(tier.points, tiers);
              const tone = tierTone(tier, tiers);
              return (
                <div
                  key={`mark-${tier.label}-${tier.points}`}
                  className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white dark:border-slate-950 ${tone.mark}`}
                  style={{ left: `${left}%` }}
                />
              );
            })}
          </div>

          {!compact &&
            sorted.map((tier) => {
              const left = barFillPercent(tier.points, tiers);
              return (
                <div
                  key={`pts-${tier.label}-${tier.points}`}
                  className="absolute top-[5.5rem] hidden -translate-x-1/2 whitespace-nowrap text-[11px] text-gray-500 dark:text-slate-400 sm:block"
                  style={{ left: `${left}%` }}
                >
                  {tier.points}
                </div>
              );
            })}
        </div>
      </div>

      <div className="mt-2 flex justify-center">
        <div className="rounded-full border border-rose-500 px-4 py-1 text-center text-sm font-semibold text-rose-700 dark:border-rose-400 dark:text-white">
          {locked ? "Reward ready" : "Current power"}: {points} pts
          {daysLabel ? ` · ${daysLabel}` : ""}
        </div>
      </div>

      {!compact && sorted.length > 0 && (
        <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs sm:hidden">
          {sorted.map((tier) => (
            <li
              key={`legend-${tier.label}-${tier.points}`}
              className={tierTone(tier, tiers).text}
            >
              {tier.label} · {tier.points}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
