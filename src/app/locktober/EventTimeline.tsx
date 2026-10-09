"use client";

import type {
  LocktoberTimelineDay,
  LocktoberTimelineEvent,
  LocktoberTimelineKind,
  LocktoberTimelineSegment,
} from "@/lib/locktober/timeline";
import { LockClosedIcon } from "@heroicons/react/24/solid";
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
  if (event.live) return event.note ?? "Currently locked";
  if (event.kind === "lock") return event.label ? `Locked ${event.label}` : "Locked";
  return event.note ?? undefined;
}

function StopwatchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="14" r="7" />
      <path d="M12 14V10.5" />
      <path d="M9.5 2.5h5" />
      <path d="M12 2.5V5" />
      <path d="M17.5 7.5 19 6" />
    </svg>
  );
}

function Chip({
  event,
  onEdit,
}: {
  event: LocktoberTimelineEvent;
  onEdit?: (id: string) => void;
}) {
  const named = event.kind === "lock" || event.kind === "unlock";
  const bare = named;
  const name = chipName(event);
  const editable = Boolean(onEdit) && (event.kind === "reward" || event.kind === "penalty");
  const className = `inline-flex max-w-56 items-center gap-1 truncate text-xs ${
    bare ? "px-0.5" : "rounded-full px-2 py-0.5"
  } ${kindClass[event.kind]} ${editable ? "cursor-pointer hover:brightness-95" : ""}`;
  const body = (
    <>
      {event.kind === "lock" ? (
        event.live ? (
          <StopwatchIcon />
        ) : (
          <LockClosedIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )
      ) : null}
      {event.label ? <span className="truncate">{event.label}</span> : null}
    </>
  );
  if (editable && onEdit) {
    return (
      <button
        type="button"
        className={className}
        title={event.note ?? name ?? "Edit log"}
        aria-label={name ? `Edit ${name}` : "Edit log"}
        onClick={() => onEdit(event.id)}
      >
        {body}
      </button>
    );
  }
  return (
    <span
      className={className}
      title={event.note ?? name}
      aria-label={named ? name : undefined}
    >
      {body}
    </span>
  );
}

function SegmentView({
  segment,
  onEdit,
}: {
  segment: LocktoberTimelineSegment;
  onEdit?: (id: string) => void;
}) {
  if (segment.type === "event") {
    return (
      <li>
        <Chip event={segment.event} onEdit={onEdit} />
      </li>
    );
  }
  return (
    <li className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full bg-gray-300 px-1.5 py-1 dark:bg-gray-700">
      {segment.events.map((event) => (
        <Chip key={event.id} event={event} onEdit={onEdit} />
      ))}
    </li>
  );
}

function DayRow({
  day,
  onEdit,
}: {
  day: LocktoberTimelineDay;
  onEdit?: (id: string) => void;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <span className="px-1 text-xs leading-none text-gray-500 dark:text-gray-400">{day.label}</span>
      <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
        {day.segments.map((segment) => (
          <SegmentView
            key={segment.type === "event" ? segment.event.id : segment.events.map((event) => event.id).join("-")}
            segment={segment}
            onEdit={onEdit}
          />
        ))}
      </ul>
    </div>
  );
}

export default function EventTimeline({
  days,
  onEdit,
}: {
  days: LocktoberTimelineDay[];
  /** Owner feed: open a logged task for editing. */
  onEdit?: (id: string) => void;
}) {
  const [shown, setShown] = useState(0);
  if (days.length === 0) return null;

  const [latest, ...earlier] = days;
  const visible = earlier.slice(0, shown);
  const remaining = earlier.length - shown;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold text-gray-900 dark:text-white">Recent</h2>
      <DayRow day={latest} onEdit={onEdit} />
      {visible.map((day) => (
        <DayRow key={day.date} day={day} onEdit={onEdit} />
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
