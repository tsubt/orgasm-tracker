"use client";

import PowerBar from "../locktober/PowerBar";
import { inDashboardWindow, TierSnapshot } from "@/lib/locktober/scoring";
import dayjs from "dayjs";
import Link from "next/link";
import { useSyncExternalStore } from "react";

export default function LocktoberBoardView({
  year,
  trackChastity,
  mine,
}: {
  year: number;
  trackChastity: boolean;
  mine: {
    points: number;
    locked: boolean;
    tiers: TierSnapshot[];
    rewardPoints: number | null;
    rewardTiers: TierSnapshot[] | null;
    daysLeft: number | null;
    shareSlug: string;
  } | null;
}) {
  const visible = useSyncExternalStore(
    () => () => {},
    () => inDashboardWindow(dayjs()),
    () => true,
  );

  if (!visible) return null;
  if (!mine && !trackChastity) return null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">
          Locktober {year}
        </h2>
        <Link
          href="/locktober"
          className="text-sm font-semibold text-pink-600 hover:underline"
        >
          {mine ? "Open yours" : "Start challenge"}
        </Link>
      </div>

      {mine ? (
        <Link href="/locktober" className="block">
          <PowerBar
            points={mine.points}
            tiers={mine.tiers}
            locked={mine.locked}
            rewardPoints={mine.rewardPoints}
            rewardTiers={mine.rewardTiers}
            daysLeft={mine.daysLeft}
            compact
          />
        </Link>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Set your orgasm allowance and start earning points.
        </p>
      )}
    </section>
  );
}
