import { barFillPercent, TierSnapshot } from "@/lib/locktober/scoring";

const BLUE: [number, number, number] = [59, 130, 246];
const HOT_PINK: [number, number, number] = [255, 20, 147];

function mix(from: [number, number, number], to: [number, number, number], t: number) {
  const amount = Math.max(0, Math.min(1, t));
  const blend = (start: number, end: number) => Math.round(start + (end - start) * amount);
  return `rgb(${blend(from[0], to[0])}, ${blend(from[1], to[1])}, ${blend(from[2], to[2])})`;
}

/** Blue at the start of the bar, hot pink at the top target. */
function scaleColor(amount: number): string {
  return mix(BLUE, HOT_PINK, amount);
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
  const here = scaleColor(fill / 100);
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
              return (
                <div
                  key={`${tier.label}-${tier.points}`}
                  className={`absolute hidden -translate-x-1/2 whitespace-nowrap text-center sm:block ${
                    index % 2 === 0 ? "top-0" : "top-4"
                  }`}
                  style={{ left: `${left}%`, color: scaleColor(left / 100) }}
                >
                  <div className="text-[10px] font-semibold uppercase leading-tight">
                    {tier.label}
                  </div>
                </div>
              );
            })}

          <div
            className={`absolute left-0 right-0 ${compact ? "top-1 h-6" : "top-12 h-8"}`}
          >
            <div className="relative h-full overflow-hidden rounded-full border border-gray-300 bg-gray-100 dark:border-slate-700 dark:bg-slate-900">
              {fill > 0 && (
                <div className="h-full overflow-hidden" style={{ width: `${fill}%` }}>
                  <div
                    className="h-full"
                    style={{
                      width: `${(100 / fill) * 100}%`,
                      background: `linear-gradient(to right, ${scaleColor(0)}, ${scaleColor(1)})`,
                    }}
                  />
                </div>
              )}
            </div>
            {sorted.map((tier) => {
              const left = barFillPercent(tier.points, tiers);
              const color = scaleColor(left / 100);
              const reached = points >= tier.points;
              return (
                <div
                  key={`mark-${tier.label}-${tier.points}`}
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2"
                  style={{
                    left: `${left}%`,
                    borderColor: color,
                    backgroundColor: reached ? color : "transparent",
                  }}
                  title={reached ? `${tier.label} reached` : tier.label}
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
        <div
          className="rounded-full border px-4 py-1 text-center text-sm font-semibold"
          style={{ borderColor: here, color: here }}
        >
          {locked ? "Reward ready" : "Current power"}: {points} pts
          {daysLabel ? ` · ${daysLabel}` : ""}
        </div>
      </div>

      {!compact && sorted.length > 0 && (
        <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs sm:hidden">
          {sorted.map((tier) => {
            const left = barFillPercent(tier.points, tiers);
            const color = scaleColor(left / 100);
            const reached = points >= tier.points;
            return (
              <li key={`legend-${tier.label}-${tier.points}`} className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rotate-45 border"
                  style={{
                    borderColor: color,
                    backgroundColor: reached ? color : "transparent",
                  }}
                />
                <span style={{ color }}>
                  {tier.label} · {tier.points}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
