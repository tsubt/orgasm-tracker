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
const PASSED = "#171717";

type MarkKind = "current" | "passed" | "ahead";
type DodgeDirection = "up" | "down" | "right";

function scaleRgb(amount: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, amount));
  return [
    Math.round(BLUE[0] + (HOT_PINK[0] - BLUE[0]) * t),
    Math.round(BLUE[1] + (HOT_PINK[1] - BLUE[1]) * t),
    Math.round(BLUE[2] + (HOT_PINK[2] - BLUE[2]) * t),
  ];
}

/** Blue at the start of the bar, hot pink at the top target. */
function scaleColor(amount: number): string {
  const [r, g, b] = scaleRgb(amount);
  return `rgb(${r}, ${g}, ${b})`;
}

function channelLinear(channel: number) {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(r: number, g: number, b: number) {
  return 0.2126 * channelLinear(r) + 0.7152 * channelLinear(g) + 0.0722 * channelLinear(b);
}

/** Same hue as the bar, pulled darker only until white type stays readable. */
function buttonFill(amount: number): string {
  const [r, g, b] = scaleRgb(amount);
  let depth = 0;
  let cr = r;
  let cg = g;
  let cb = b;
  while (1.05 / (luminance(cr, cg, cb) + 0.05) < 5 && depth < 0.45) {
    depth += 0.02;
    cr = Math.round(r * (1 - depth));
    cg = Math.round(g * (1 - depth));
    cb = Math.round(b * (1 - depth));
  }
  return `rgb(${cr}, ${cg}, ${cb})`;
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
  dense = false,
}: {
  kind: MarkKind;
  color: string;
  muted: boolean;
  dense?: boolean;
}) {
  const size = dense
    ? kind === "passed"
      ? "h-1.5 w-1.5 border"
      : kind === "current"
        ? "h-2.5 w-2.5 border-2"
        : "h-2 w-2 border"
    : kind === "passed"
      ? "h-2 w-2 border"
      : kind === "current"
        ? "h-3.5 w-3.5 border-2"
        : "h-3 w-3 border-2";
  const style: CSSProperties = muted
    ? {
        backgroundColor: kind === "passed" ? "#9ca3af" : "transparent",
        borderColor: "#9ca3af",
      }
    : kind === "current"
      ? { backgroundColor: color, borderColor: color, boxShadow: "0 0 0 1px #fff" }
      : kind === "passed"
        ? { backgroundColor: PASSED, borderColor: PASSED }
        : { backgroundColor: "transparent", borderColor: color };
  return <div className={`inline-block shrink-0 rotate-45 ${size}`} style={style} />;
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
      ? "text-[10px] font-bold uppercase leading-tight"
      : kind === "passed"
        ? "text-[10px] font-semibold uppercase leading-tight text-gray-800 dark:text-gray-200"
        : "text-[10px] font-semibold uppercase leading-tight";
  return (
    <span
      className={className}
      style={!muted && kind !== "passed" ? { color: scaleColor(at / 100) } : undefined}
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
  dense = false,
}: {
  orientation: "horizontal" | "vertical";
  fill: number;
  sorted: TierSnapshot[];
  earned: TierSnapshot | null;
  /** Previous period's points, while that reward is still unclaimed. */
  rewardReady?: number;
  slim?: boolean;
  dense?: boolean;
}) {
  const horizontal = orientation === "horizontal";
  const thickness = dense ? "h-4" : slim ? "h-6" : "h-8";
  const ghost = rewardReady == null ? 0 : barFillPercent(rewardReady, sorted);
  return (
    <div className={horizontal ? `relative ${thickness}` : "relative h-full w-8 shrink-0"}>
      <div
        className={`absolute overflow-hidden rounded-full border border-gray-300 bg-gray-100 dark:border-slate-700 dark:bg-slate-900 ${
          horizontal ? `inset-x-0 top-1/2 ${thickness} -translate-y-1/2` : "inset-0"
        }`}
      >
        {ghost > 0 &&
          (horizontal ? (
            <div
              className="absolute inset-y-0 left-0 z-0 bg-gray-400 dark:bg-gray-500"
              style={{ width: `${ghost}%` }}
              title={`Previous period: ${rewardReady} pts`}
            />
          ) : (
            <div
              className="absolute inset-x-0 bottom-0 z-0 bg-gray-400 dark:bg-gray-500"
              style={{ height: `${ghost}%` }}
              title={`Previous period: ${rewardReady} pts`}
            />
          ))}
        {fill > 0 &&
          (horizontal ? (
            <div className="relative z-10 h-full overflow-hidden" style={{ width: `${fill}%` }}>
              <div
                className="h-full"
                style={{
                  width: `${(100 / fill) * 100}%`,
                  background: `linear-gradient(to right, ${scaleColor(0)}, ${scaleColor(1)})`,
                }}
              />
            </div>
          ) : (
            <div className="absolute inset-x-0 bottom-0 z-10 overflow-hidden" style={{ height: `${fill}%` }}>
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
        const title =
          kind === "current"
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
            <Mark kind={kind} color={scaleColor(at / 100)} muted={false} dense={dense} />
          </div>
        );
      })}
    </div>
  );
}

function ClaimControl({
  earned,
  points,
  tone,
  onClaim,
  align,
}: {
  earned: TierSnapshot;
  points: number;
  tone: number;
  onClaim?: () => void;
  align: "left" | "center";
}) {
  const color = buttonFill(tone);
  const className = `box-border w-full min-w-0 max-w-full whitespace-normal break-words rounded-2xl border-2 px-4 py-2 text-sm font-semibold text-white hover:brightness-95 ${
    align === "center" ? "text-center" : "text-left"
  }`;
  const style = { backgroundColor: color, borderColor: color };
  const label = `Cum day reward: ${earned.label}`;
  const body = (
    <>
      <span className="block">
        {label}
        {earned.expectsLocked && <TierLockIcon />}
      </span>
      <span className="mt-0.5 block text-xs font-medium">{points} pts</span>
    </>
  );
  if (!onClaim) return <div className={className} style={style}>{body}</div>;
  return (
    <button type="button" className={className} style={style} onClick={onClaim}>
      {body}
    </button>
  );
}

export default function PowerBar({
  points,
  tiers,
  locked,
  rewardPoints = null,
  rewardTiers = null,
  daysLeft = null,
  compact = false,
  trackOnly = false,
  onClaim,
}: {
  points: number;
  tiers: TierSnapshot[];
  locked: boolean;
  rewardPoints?: number | null;
  rewardTiers?: TierSnapshot[] | null;
  daysLeft?: number | null;
  compact?: boolean;
  /** Sidebar feed: the track alone, without the power pill or reward button. */
  trackOnly?: boolean;
  /** Present on the owner page. Clicking claims the highest reward. */
  onClaim?: () => void;
}) {
  const fill = barFillPercent(points, tiers);
  const sorted = [...tiers].sort((a, b) => a.points - b.points);
  const earned = highestEarned(points, sorted);
  // The preview locks the bar in place. The live page passes a separate reward score.
  const separateReward = rewardPoints != null;
  const rewardScore = separateReward ? rewardPoints : points;
  const rewardSorted = [...(rewardTiers ?? tiers)].sort((a, b) => a.points - b.points);
  const rewardEarned = locked ? highestEarned(rewardScore, rewardSorted) : null;
  const rewardReady = locked && rewardScore > 0 ? rewardScore : undefined;
  if (trackOnly) {
    return (
      <div className="min-w-0 px-2">
        <BarTrack
          orientation="horizontal"
          fill={fill}
          sorted={sorted}
          earned={earned}
          rewardReady={rewardReady}
          slim
        />
      </div>
    );
  }
  const here = scaleColor(fill / 100);
  const outcome = countdownReward(points, sorted);
  const daysPhrase = daysLeft == null ? null : daysLeftPhrase(daysLeft, outcome);

  const names = sorted.map((tier) => {
    const at = barFillPercent(tier.points, sorted);
    const kind = markKind(tier, earned);
    return {
      key: `${tier.label}-${tier.points}`,
      at,
      node: <TierName tier={tier} kind={kind} at={at} muted={false} />,
    };
  });
  const pointLabels = sorted.map((tier) => {
    const kind = markKind(tier, earned);
    return {
      key: `pts-${tier.label}-${tier.points}`,
      at: barFillPercent(tier.points, sorted),
      node: (
        <span
          className={
            kind === "current"
              ? "text-[11px] font-semibold"
              : "text-[11px] text-gray-500 dark:text-slate-400"
          }
          style={kind === "current" ? { color: scaleColor(barFillPercent(tier.points, sorted) / 100) } : undefined}
        >
          {tier.points}
        </span>
      ),
    };
  });

  return (
    <div
      className={`@container min-w-0 max-w-full rounded-xl border border-gray-200 bg-white text-gray-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white ${compact ? "p-3" : "p-3 @min-[640px]:p-5"}`}
    >
      {!compact && (
        <div className="mb-2 text-center @min-[640px]:mb-4">
          <h2 className="text-xl font-bold tracking-wide text-rose-600 dark:text-rose-400">
            LOCKTOBER POWER BAR
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Midnight locks in the highest reward and resets the bar. Points after that count toward the next cum day.
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
            <BarTrack
              orientation="horizontal"
              fill={fill}
              sorted={sorted}
              earned={earned}
              rewardReady={rewardReady}
              dense
            />
            <ul className="mt-2 flex flex-wrap justify-center gap-x-2.5 gap-y-1">
              {sorted.map((tier) => {
                const at = barFillPercent(tier.points, sorted);
                const kind = markKind(tier, earned);
                return (
                  <li
                    key={`legend-${tier.label}-${tier.points}`}
                    className="inline-flex items-center gap-1 leading-none"
                  >
                    <Mark kind={kind} color={scaleColor(at / 100)} muted={false} dense />
                    <TierName tier={tier} kind={kind} at={at} muted={false} />
                    <span className="text-[10px] tabular-nums text-gray-500 dark:text-slate-400">
                      {tier.points}
                    </span>
                  </li>
                );
              })}
            </ul>
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
        className={`flex flex-col gap-2 ${compact ? "mt-2 w-full min-w-0" : "mt-2 w-full min-w-0 @min-[640px]:mt-3"}`}
      >
        {rewardReady != null && separateReward && (
          <p className="text-center text-xs text-gray-500 dark:text-slate-400">
            Gray bar is the locked reward.
          </p>
        )}
        <div className="flex justify-center">
          <div
            className="rounded-full border px-4 py-1 text-center text-sm font-semibold"
            style={{ borderColor: here, color: here }}
          >
            Current power: {points} pts · {daysPhrase ?? outcome}
          </div>
        </div>
        {locked && rewardEarned ? (
          <ClaimControl
            earned={rewardEarned}
            points={rewardScore}
            tone={barFillPercent(rewardScore, rewardSorted) / 100}
            onClaim={onClaim}
            align="left"
          />
        ) : locked ? (
          <div className="text-sm font-semibold text-gray-500">{DENIAL_LABEL}</div>
        ) : null}
      </div>
    </div>
  );
}
