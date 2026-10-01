"use client";

import type {
  LocktoberTimelineDay,
  LocktoberTimelineEvent,
  LocktoberTimelineKind,
  LocktoberTimelineSegment,
} from "@/lib/locktober/timeline";
import { LockClosedIcon, LockOpenIcon } from "@heroicons/react/24/solid";
import { useState } from "react";

const PAGE_SIZE = 3;

const kindClass: Record<LocktoberTimelineKind, string> = {
  reward: "bg-emerald-100 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-100",
  penalty: "bg-rose-100 text-rose-950 dark:bg-rose-900/40 dark:text-rose-100",
  lock: "text-gray-700 dark:text-gray-200",
  unlock: "text-gray-700 dark:text-gray-200",
  claim: "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100",
};

function chipName(event: LocktoberTimelineEvent) {
  if (event.kind === "lock") return event.label ? `Locked ${event.label}` : "Locked";
  if (event.kind === "unlock") return `Unlocked ${event.label}`;
  return event.note ?? undefined;
}

function Chip({ event }: { event: LocktoberTimelineEvent }) {
  const named = event.kind === "lock" || event.kind === "unlock";
  const bare = named;
  return (
    <span
      className={`inline-flex max-w-56 items-center gap-1 truncate text-xs ${
        bare ? "px-0.5" : "rounded-full px-2 py-0.5"
      } ${kindClass[event.kind]}`}
      title={event.note ?? chipName(event)}
      aria-label={named ? chipName(event) : undefined}
    >
      {event.kind === "lock" ? (
        <LockClosedIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : null}
      {event.kind === "unlock" ? (
        <LockOpenIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : null}
      {event.label ? <span className="truncate">{event.label}</span> : null}
    </span>
  );
}

function SegmentView({ segment }: { segment: LocktoberTimelineSegment }) {
  if (segment.type === "event") {
    return (
      <li>
        <Chip event={segment.event} />
      </li>
    );
  }
  return (
    <li className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full bg-gray-300 px-1.5 py-1 dark:bg-gray-700">
      {segment.events.map((event) => (
        <Chip key={event.id} event={event} />
      ))}
    </li>
  );
}

function DayRow({ day }: { day: LocktoberTimelineDay }) {
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <span className="px-1 text-xs leading-none text-gray-500 dark:text-gray-400">{day.label}</span>
      <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
        {day.segments.map((segment) => (
          <SegmentView
            key={segment.type === "event" ? segment.event.id : segment.events.map((event) => event.id).join("-")}
            segment={segment}
          />
        ))}
      </ul>
    </div>
  );
}

export default function EventTimeline({ days }: { days: LocktoberTimelineDay[] }) {
  const [shown, setShown] = useState(0);
  if (days.length === 0) return null;

  const [latest, ...earlier] = days;
  const visible = earlier.slice(0, shown);
  const remaining = earlier.length - shown;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold text-gray-900 dark:text-white">Recent</h2>
      <DayRow day={latest} />
      {visible.map((day) => (
        <DayRow key={day.date} day={day} />
      ))}
      {remaining > 0 || shown > 0 ? (
        <div className="flex items-center gap-3 text-sm">
          {remaining > 0 ? (
            <button
              type="button"
              className="font-medium text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
              onClick={() => setShown((count) => Math.min(earlier.length, count + PAGE_SIZE))}
            >
              Show more · {Math.min(PAGE_SIZE, remaining)}
            </button>
          ) : null}
          {shown > 0 ? (
            <button
              type="button"
              className="font-medium text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
              onClick={() => setShown((count) => Math.max(0, count - PAGE_SIZE))}
            >
              Show less
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
