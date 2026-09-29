"use client";

import PowerBar from "../locktober/PowerBar";
import type { PublicChallengeCard } from "@/lib/locktober/load";
import { inDashboardWindow } from "@/lib/locktober/scoring";
import dayjs from "dayjs";
import Link from "next/link";
import { useSyncExternalStore } from "react";

export default function LocktoberParticipantsView({
  year,
  participants,
}: {
  year: number;
  participants: PublicChallengeCard[];
}) {
  const visible = useSyncExternalStore(
    () => () => {},
    () => inDashboardWindow(dayjs()),
    () => true,
  );

  if (!visible) return null;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-white">
        Locktober {year}
      </h3>
      {participants.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No public challenges yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {participants.map((participant) => {
            const label = participant.username
              ? `@${participant.username}`
              : participant.name || "Someone";
            return (
              <li key={participant.id}>
                <Link
                  href={`/locktober/s/${participant.username ?? participant.shareSlug}`}
                  className="flex flex-col gap-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {label} · {participant.likeCount}{" "}
                    {participant.likeCount === 1 ? "like" : "likes"}
                  </span>
                  <PowerBar
                    points={participant.bar.points}
                    tiers={participant.bar.tiers}
                    locked={participant.bar.locked}
                    daysLeft={participant.bar.daysLeft}
                    compact
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
