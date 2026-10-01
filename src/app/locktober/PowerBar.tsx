"use client";

import { LockClosedIcon } from "@heroicons/react/24/solid";
import { barFillPercent, TierSnapshot } from "@/lib/locktober/scoring";
import { countdownReward, daysLeftPhrase, DENIAL_LABEL } from "@/lib/locktober/shareLine";
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

const BLUE: [number, number, number] = [59, 130, 246];
const HOT_PINK: [number, number, number] = [255, 20, 147];
const GOLD = "#f0c014";
const GOLD_EDGE = "#a16207";
const PASSED = "#171717";

type MarkKind = "current" | "passed" | "ahead";
type DodgeDirection = "up" | "down" | "right";

function mix(from: [number, number, number], to: [number, number, number], t: number) {
  const amount = Math.max(0, Math.min(1, t));
  const blend = (start: number, end: number) => Math.round(start + (end - start) * amount);
  return `rgb(${blend(from[0], to[0])}, ${blend(from[1], to[1])}, ${blend(from[2], to[2])})`;
}

/** Blue at the start of the bar, hot pink at the top target. */
function scaleColor(amount: number): string {
  return mix(BLUE, HOT_PINK, amount);
}

function highestEarned(points: number, sorted: TierSnapshot[]): TierSnapshot | null {
  let best: TierSnapshot | null = null;
  for (const tier of sorted) {
    if (points >= tier.points) best = tier;
  }
  return best;
}

function markKind(tier: TierSnapshot, earned: TierSnapshot | null): MarkKind {
  if (!earned || tier.points > earned.points) return "ahead";
  if (tier.points === earned.points) return "current";
  return "passed";
}

function dodgeLanes(spans: { start: number; end: number }[], gap: number): number[] {
  const placed: { start: number; end: number; lane: number }[] = [];
  return spans.map((span) => {
    let lane = 0;
    while (
      lane < 4 &&
      placed.some(
        (other) =>
          other.lane === lane &&
          span.start < other.end + gap &&
          span.end > other.start - gap,
      )
    ) {
      lane += 1;
    }
    placed.push({ ...span, lane });
    return lane;
  });
}

function sameLayout(
  prev: { lanes: number[]; line: number },
  next: { lanes: number[]; line: number },
) {
  return (
    prev.line === next.line &&
    prev.lanes.length === next.lanes.length &&
    prev.lanes.every((lane, index) => lane === next.lanes[index])
  );
}

/**
 * Places every label on one line, then shifts a label aside only when it
 * would overlap a neighbor. `up` / `down` stack away from a horizontal bar;
 * `right` steps further right of a vertical bar.
 */
function DodgeLabels({
  items,
  direction,
  className,
}: {
  items: { key: string; at: number; node: ReactNode }[];
  direction: DodgeDirection;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const signature = `${direction}|${items.map((item) => `${item.key}:${item.at.toFixed(2)}`).join("|")}`;
  const [layout, setLayout] = useState<{ lanes: number[]; line: number }>({
    lanes: [],
    line: 16,
  });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const current = items;
      const vertical = direction === "right";
      const along = vertical ? container.clientHeight : container.clientWidth;
      if (along < 8) return;
      const spans = current.map((item, index) => {
        const el = itemRefs.current[index];
        const size = el ? (vertical ? el.offsetHeight : el.offsetWidth) : 0;
        const center = (item.at / 100) * along;
        return { start: center - size / 2, end: center + size / 2 };
      });
      const lanes = dodgeLanes(spans, 6);
      const line = Math.max(
        16,
        ...current.map((_, index) => {
          const el = itemRefs.current[index];
          if (!el) return 0;
          return vertical ? el.offsetWidth : el.offsetHeight;
        }),
      );
      const next = { lanes, line };
      setLayout((prev) => (sameLayout(prev, next) ? prev : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    let cancel = false;
    document.fonts?.ready.then(() => {
      if (!cancel) measure();
    });
    return () => {
      cancel = true;
      observer.disconnect();
    };
    // `signature` already changes when the labels or their positions change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const maxLane = layout.lanes.reduce((highest, lane) => Math.max(highest, lane), 0);
  const step = layout.line + 4;
  const crossSize = layout.line + maxLane * step;
  const containerStyle: CSSProperties | undefined =
    direction === "right" ? { width: crossSize } : { height: crossSize };

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`} style={containerStyle}>
      {items.map((item, index) => {
        const lane = layout.lanes[index] ?? 0;
        const shift = lane * step;
        const style: CSSProperties =
          direction === "up"
            ? {
                left: `${item.at}%`,
                bottom: 0,
                transform: `translateX(-50%) translateY(${-shift}px)`,
              }
            : direction === "down"
              ? {
                  left: `${item.at}%`,
                  top: 0,
                  transform: `translateX(-50%) translateY(${shift}px)`,
                }
              : {
                  left: 0,
                  bottom: `${item.at}%`,
                  transform: `translateY(50%) translateX(${shift}px)`,
                };
        return (
          <div
            key={item.key}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            className="absolute whitespace-nowrap"
            style={style}
          >
            {item.node}
          </div>
        );
      })}
    </div>
  );
}

function Mark({
  kind,
  color,
  muted,
}: {
  kind: MarkKind;
  color: string;
  muted: boolean;
}) {
  const size =
    kind === "passed" ? "h-2 w-2 border" : kind === "current" ? "h-3.5 w-3.5 border-2" : "h-3 w-3 border-2";
  const style: CSSProperties = muted
    ? {
        backgroundColor: kind === "passed" ? "#9ca3af" : "transparent",
        borderColor: "#9ca3af",
      }
    : kind === "current"
      ? { backgroundColor: GOLD, borderColor: GOLD_EDGE, boxShadow: "0 0 0 1px #fff" }
      : kind === "passed"
        ? { backgroundColor: PASSED, borderColor: PASSED }
        : { backgroundColor: "transparent", borderColor: color };
  return <div className={`rotate-45 ${size}`} style={style} />;
}

export function TierLockIcon() {
  return (
    <LockClosedIcon
      className="ml-0.5 inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em]"
      aria-label="Locked"
    />
  );
}

function TierName({
  tier,
  kind,
  at,
  muted,
}: {
  tier: TierSnapshot;
  kind: MarkKind;
  at: number;
  muted: boolean;
}) {
  const className = muted
    ? "text-[10px] font-semibold uppercase leading-tight text-gray-400 dark:text-gray-500"
    : kind === "current"
      ? "text-[10px] font-bold uppercase leading-tight text-amber-700 dark:text-amber-300"
      : kind === "passed"
        ? "text-[10px] font-semibold uppercase leading-tight text-gray-800 dark:text-gray-200"
        : "text-[10px] font-semibold uppercase leading-tight";
  return (
    <span
      className={className}
      style={!muted && kind === "ahead" ? { color: scaleColor(at / 100) } : undefined}
    >
      {tier.label}
      {tier.expectsLocked && <TierLockIcon />}
    </span>
  );
}

function BarTrack({
  orientation,
  fill,
  sorted,
  earned,
  rewardReady,
  slim = false,
}: {
  orientation: "horizontal" | "vertical";
  fill: number;
  sorted: TierSnapshot[];
  earned: TierSnapshot | null;
  rewardReady: boolean;
  slim?: boolean;
}) {
  const horizontal = orientation === "horizontal";
  const thickness = slim ? "h-6" : "h-8";
  return (
    <div className={horizontal ? `relative ${thickness}` : "relative h-full w-8 shrink-0"}>
      <div
        className={`absolute overflow-hidden rounded-full border border-gray-300 bg-gray-100 dark:border-slate-700 dark:bg-slate-900 ${
          horizontal ? `inset-x-0 top-1/2 ${thickness} -translate-y-1/2` : "inset-0"
        }`}
      >
        {fill > 0 &&
          (horizontal ? (
            <div className="h-full overflow-hidden" style={{ width: `${fill}%` }}>
              <div
                className="h-full"
                style={{
                  width: `${(100 / fill) * 100}%`,
                  background: `linear-gradient(to right, ${scaleColor(0)}, ${scaleColor(1)})`,
                }}
              />
            </div>
          ) : (
            <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ height: `${fill}%` }}>
              <div
                className="absolute inset-x-0 bottom-0"
                style={{
                  height: `${(100 / fill) * 100}%`,
                  background: `linear-gradient(to top, ${scaleColor(0)}, ${scaleColor(1)})`,
                }}
              />
            </div>
          ))}
      </div>
      {sorted.map((tier) => {
        const at = barFillPercent(tier.points, sorted);
        const kind = markKind(tier, earned);
        const muted = rewardReady && kind !== "current";
        const title = muted
          ? `${tier.label} locked`
          : kind === "current"
            ? `${tier.label} earned`
            : kind === "passed"
              ? `${tier.label} passed`
              : tier.label;
        const style: CSSProperties = horizontal
          ? { left: `${at}%`, top: "50%", transform: "translate(-50%, -50%)" }
          : { bottom: `${at}%`, left: "50%", transform: "translate(-50%, 50%)" };
        return (
          <div
            key={`mark-${tier.label}-${tier.points}`}
            className={`absolute ${kind === "current" ? "z-10" : "z-0"}`}
            style={style}
            title={title}
          >
            <Mark kind={kind} color={scaleColor(at / 100)} muted={muted} />
          </div>
        );
      })}
    </div>
  );
}

function ClaimControl({
  earned,
  points,
  onClaim,
  align,
}: {
  earned: TierSnapshot;
  points: number;
  onClaim?: () => void;
  align: "left" | "center";
}) {
  const className = `box-border w-full min-w-0 max-w-full whitespace-normal break-words rounded-2xl border-2 border-amber-500 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-300 dark:bg-amber-950/50 dark:text-amber-50 ${
    align === "center" ? "text-center" : "text-left"
  }`;
  const label = `Cum day reward: ${earned.label}`;
  const body = (
    <>
      <span className="block">
        {label}
        {earned.expectsLocked && <TierLockIcon />}
      </span>
      <span className="mt-0.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
        {points} pts · claiming resets the bar
      </span>
    </>
  );
  if (!onClaim) return <div className={className}>{body}</div>;
  return (
    <button type="button" className={className} onClick={onClaim}>
      {body}
    </button>
  );
}

export default function PowerBar({
  points,
  tiers,
  locked,
  daysLeft = null,
  compact = false,
  onClaim,
}: {
  points: number;
  tiers: TierSnapshot[];
  locked: boolean;
  daysLeft?: number | null;
  compact?: boolean;
  /** Present on the owner page. Clicking claims the highest reward. */
  onClaim?: () => void;
}) {
  const fill = barFillPercent(points, tiers);
  const sorted = [...tiers].sort((a, b) => a.points - b.points);
  const earned = highestEarned(points, sorted);
  const rewardReady = locked;
  const here = scaleColor(fill / 100);
  const outcome = countdownReward(points, sorted);
  const daysPhrase =
    daysLeft == null || locked ? null : daysLeftPhrase(daysLeft, outcome);

  const names = sorted.map((tier) => {
    const at = barFillPercent(tier.points, sorted);
    const kind = markKind(tier, earned);
    return {
      key: `${tier.label}-${tier.points}`,
      at,
      node: <TierName tier={tier} kind={kind} at={at} muted={rewardReady && kind !== "current"} />,
    };
  });
  const pointLabels = sorted.map((tier) => {
    const kind = markKind(tier, earned);
    const muted = rewardReady && kind !== "current";
    return {
      key: `pts-${tier.label}-${tier.points}`,
      at: barFillPercent(tier.points, sorted),
      node: (
        <span
          className={
            muted
              ? "text-[11px] text-gray-400 dark:text-gray-500"
              : kind === "current"
                ? "text-[11px] font-semibold text-amber-700 dark:text-amber-300"
                : "text-[11px] text-gray-500 dark:text-slate-400"
          }
        >
          {tier.points}
        </span>
      ),
    };
  });

  return (
    <div
      className={`@container min-w-0 max-w-full rounded-xl border border-gray-200 bg-white text-gray-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white ${compact ? "p-3" : "p-5"}`}
    >
      {!compact && (
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold tracking-wide text-rose-600 dark:text-rose-400">
            LOCKTOBER POWER BAR
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Cum days are when you claim. Only the highest reward counts, then the bar resets.
          </p>
        </div>
      )}

      {compact ? (
        <BarTrack
          orientation="horizontal"
          fill={fill}
          sorted={sorted}
          earned={earned}
          rewardReady={rewardReady}
          slim
        />
      ) : (
        <>
          <div className="@min-[640px]:hidden">
            <div
              className="flex min-w-0 items-stretch justify-start gap-3"
              style={{ height: Math.max(220, sorted.length * 56) }}
            >
              <BarTrack
                orientation="vertical"
                fill={fill}
                sorted={sorted}
                earned={earned}
                rewardReady={rewardReady}
              />
              <DodgeLabels items={names} direction="right" className="h-full shrink-0" />
              {!rewardReady && (
                <div className="flex min-w-0 flex-1 flex-col justify-center text-left leading-tight">
                  <div className="whitespace-nowrap text-[11px] font-semibold uppercase" style={{ color: here }}>
                    Current power
                  </div>
                  <div className="text-lg font-bold" style={{ color: here }}>
                    {points}
                    <span className="ml-1 text-xs font-semibold">pts</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    {daysPhrase ?? outcome}
                  </div>
                </div>
              )}
            </div>
            {rewardReady && (
              <div className="mt-3 w-full min-w-0">
                {earned ? (
                  <ClaimControl earned={earned} points={points} onClaim={onClaim} align="left" />
                ) : (
                  <div className="text-sm font-semibold text-gray-500">{DENIAL_LABEL}</div>
                )}
              </div>
            )}
          </div>

          <div className="hidden px-6 @min-[640px]:block">
            <DodgeLabels items={names} direction="up" className="mb-1" />
            <BarTrack
              orientation="horizontal"
              fill={fill}
              sorted={sorted}
              earned={earned}
              rewardReady={rewardReady}
            />
            <DodgeLabels items={pointLabels} direction="down" className="mt-1" />
          </div>
        </>
      )}

      <div
        className={
          compact
            ? "mt-2 w-full min-w-0"
            : "mt-3 hidden w-full min-w-0 @min-[640px]:block"
        }
      >
        {rewardReady && earned ? (
          <ClaimControl earned={earned} points={points} onClaim={onClaim} align="left" />
        ) : rewardReady ? (
          <div className="text-sm font-semibold text-gray-500">{DENIAL_LABEL}</div>
        ) : (
          <div className="flex justify-center">
            <div
              className="rounded-full border px-4 py-1 text-center text-sm font-semibold"
              style={{ borderColor: here, color: here }}
            >
              Current power: {points} pts · {daysPhrase ?? outcome}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
