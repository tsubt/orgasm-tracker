import type { ReactNode } from "react";
import { cardTargets, locktoberCardLines } from "./cardSnapshot";
import { barFillPercent } from "./scoring";
import type { RewardTarget } from "./shareLine";

const WIDTH = 1200;
const HEIGHT = 630;

function LockIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="#111827">
      <path
        fillRule="evenodd"
        d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function DropIcon() {
  return (
    <svg width="44" height="48" viewBox="0 0 24 24" fill="#38bdf8">
      <path d="M12 2.2c2.8 4 5.4 7.2 5.4 10.6a5.4 5.4 0 1 1-10.8 0c0-3.4 2.6-6.6 5.4-10.6Z" />
    </svg>
  );
}

function DiamondIcon() {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        background: "#f0c014",
        border: "4px solid #a16207",
        transform: "rotate(45deg)",
      }}
    />
  );
}

function Stat({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginRight: 56 }}>
      <div style={{ display: "flex", marginRight: 16 }}>{icon}</div>
      <div style={{ fontSize: 40, fontWeight: 700 }}>{label}</div>
    </div>
  );
}

const BLUE: [number, number, number] = [59, 130, 246];
const HOT_PINK: [number, number, number] = [255, 20, 147];

function scaleColor(amount: number) {
  const t = Math.max(0, Math.min(1, amount));
  const blend = (start: number, end: number) => Math.round(start + (end - start) * t);
  return `rgb(${blend(BLUE[0], HOT_PINK[0])}, ${blend(BLUE[1], HOT_PINK[1])}, ${blend(BLUE[2], HOT_PINK[2])})`;
}

function TargetMark({
  at,
  kind,
}: {
  at: number;
  kind: "current" | "passed" | "ahead";
}) {
  const size = kind === "current" ? 22 : kind === "passed" ? 12 : 16;
  const background =
    kind === "current" ? "#f0c014" : kind === "passed" ? "#171717" : "transparent";
  const border =
    kind === "current" ? "3px solid #a16207" : kind === "passed" ? "2px solid #171717" : `3px solid ${scaleColor(at / 100)}`;
  return (
    <div
      style={{
        position: "absolute",
        left: `${at}%`,
        top: kind === "current" ? 5 : kind === "passed" ? 10 : 8,
        width: size,
        height: size,
        marginLeft: -(size / 2),
        background,
        border,
        transform: "rotate(45deg)",
      }}
    />
  );
}

function TargetBar({ points, targets }: { points: number; targets: RewardTarget[] }) {
  const earned = [...targets].reverse().find((target) => points >= target.points) ?? null;
  const fill = barFillPercent(points, targets);
  return (
    <div style={{ display: "flex", position: "relative", width: "100%", height: 36, marginTop: 40 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 8,
          height: 20,
          borderRadius: 999,
          background: "#f3f4f6",
          border: "2px solid #d1d5db",
          overflow: "hidden",
          display: "flex",
        }}
      >
        {fill > 0 ? (
          <div style={{ display: "flex", width: `${fill}%`, height: "100%", overflow: "hidden" }}>
            <div
              style={{
                width: `${(100 / fill) * 100}%`,
                height: "100%",
                background: `linear-gradient(to right, ${scaleColor(0)}, ${scaleColor(1)})`,
              }}
            />
          </div>
        ) : null}
      </div>
      {targets.map((target) => {
        const at = barFillPercent(target.points, targets);
        const kind =
          earned && target.points === earned.points && target.label === earned.label
            ? "current"
            : earned && target.points < earned.points
              ? "passed"
              : "ahead";
        return <TargetMark key={`${target.label}-${target.points}`} at={at} kind={kind} />;
      })}
    </div>
  );
}

export function locktoberCardElement(card: {
  display: string;
  year: number;
  lockedMinutes: number;
  points: number;
  daysLeft: number | null;
  targets: unknown;
} | null) {
  const lines = card ? locktoberCardLines(card) : null;
  const targets = card ? cardTargets(card.targets) : [];
  const title = card ? `${card.display}'s Locktober ${card.year}` : "Locktober";
  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        background: "#f8fafc",
        color: "#111827",
      }}
    >
      <div style={{ height: 16, width: "100%", background: "#ec4899" }} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "64px 72px",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 3,
            color: "#ec4899",
          }}
        >
          ORGASMTRACKER
        </div>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 700, marginTop: 24 }}>
          {title}
        </div>
        {card ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {targets.length > 0 ? <TargetBar points={card.points} targets={targets} /> : null}
            <div style={{ display: "flex", alignItems: "center", marginTop: 36 }}>
              <Stat icon={<LockIcon />} label={lines?.hours ?? ""} />
              <Stat icon={<DiamondIcon />} label={lines?.points ?? ""} />
            </div>
            {lines?.days ? (
              <div style={{ display: "flex", alignItems: "center", marginTop: 22 }}>
                <div style={{ display: "flex", marginRight: 16 }}>
                  <DropIcon />
                </div>
                <div style={{ fontSize: 36, fontWeight: 700 }}>{lines.days}</div>
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 36, marginTop: 48, color: "#4b5563" }}>
            A Locktober challenge
          </div>
        )}
      </div>
    </div>
  );
}

export const locktoberCardSize = { width: WIDTH, height: HEIGHT };
