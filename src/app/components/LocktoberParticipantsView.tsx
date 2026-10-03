"use client";

import PowerBar from "../locktober/PowerBar";
import type { PublicChallengeCard } from "@/lib/locktober/load";
import { inDashboardWindow } from "@/lib/locktober/scoring";
import { LockClosedIcon } from "@heroicons/react/24/solid";
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
            const lockedHours = Math.floor(participant.lockedMinutes / 60);
            return (
              <li key={participant.id}>
                <Link
                  href={`/locktober/s/${participant.username ?? participant.shareSlug}`}
                  className="flex flex-col gap-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <span className="inline-flex flex-wrap items-center gap-x-1 text-sm font-medium text-gray-900 dark:text-white">
                    <span>{label}</span>
                    <span aria-hidden>·</span>
                    <span
                      className="inline-flex items-center gap-0.5"
                      aria-label={`${lockedHours} hours locked`}
                    >
                      <LockClosedIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {lockedHours}h
                    </span>
                    <span aria-hidden>·</span>
                    <span>
                      {participant.likeCount} {participant.likeCount === 1 ? "like" : "likes"}
                    </span>
                  </span>
                  <PowerBar
                    points={participant.bar.points}
                    tiers={participant.bar.tiers}
                    locked={participant.bar.locked}
                    rewardPoints={participant.bar.rewardPoints}
                    rewardTiers={participant.bar.rewardTiers}
                    daysLeft={participant.bar.daysLeft}
                    trackOnly
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
