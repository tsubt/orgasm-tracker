import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { octoberEnd, octoberStart, type LockedSpan } from "./scoring";

dayjs.extend(utc);
dayjs.extend(timezone);

export type LocktoberTimelineKind = "reward" | "penalty" | "lock" | "unlock" | "claim";

export type LocktoberTimelineEvent = {
  id: string;
  label: string;
  kind: LocktoberTimelineKind;
  note: string | null;
};

export type LocktoberTimelineSegment =
  | { type: "event"; event: LocktoberTimelineEvent }
  | { type: "session"; events: LocktoberTimelineEvent[] };

export type LocktoberTimelineDay = {
  date: string;
  label: string;
  segments: LocktoberTimelineSegment[];
};

type TimelineInput = {
  year: number;
  timeZone: string;
  now: Date | string;
  completions: {
    id: string;
    completedAt: string;
    pointsAwarded: number;
    title: string;
    note: string | null;
  }[];
  cumDays: {
    id: string;
    status: string;
    claimedAt: string | null;
    claimedTierLabel: string | null;
  }[];
  spans: LockedSpan[];
};

type RawEvent = LocktoberTimelineEvent & { at: number; order: number; session: number | null };

type MergedSpan = { from: number; to: number | null };

function inOctober(at: number, start: number, end: number) {
  return at >= start && at < end;
}

function pointsLabel(title: string, points: number) {
  if (points > 0) return `${title} +${points}`;
  if (points < 0) return `${title} ${points}`;
  return title;
}

function noteOrNull(note: string | null | undefined) {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}

/** Compact session length for an unlock badge, e.g. "40m" or "2d 4h". */
function sessionDurationLabel(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  if (hours < 24) return remain === 0 ? `${hours}h` : `${hours}h ${remain}m`;
  const days = Math.floor(hours / 24);
  const dayHours = hours % 24;
  return dayHours === 0 ? `${days}d` : `${days}d ${dayHours}h`;
}

/** Whole hours for a session that is still open. */
function activeHoursLabel(ms: number) {
  const hours = Math.floor(Math.max(0, ms) / 3_600_000);
  return hours < 1 ? "<1h" : `${hours}h`;
}

function sessionAt(at: number, spans: MergedSpan[]) {
  const index = spans.findIndex((span) => at >= span.from && at <= (span.to ?? Infinity));
  return index === -1 ? null : index;
}

/** Merged chastity intervals. An open session has `to: null`. */
function mergedSpans(spans: LockedSpan[]): MergedSpan[] {
  const raw = spans
    .map((span) => {
      const from = new Date(span.startTime).getTime();
      const to = span.endTime ? new Date(span.endTime).getTime() : null;
      return { from, to };
    })
    .filter((span) => Number.isFinite(span.from) && (span.to == null || span.to > span.from))
    .sort((a, b) => a.from - b.from);

  const merged: { from: number; to: number | null }[] = [];
  for (const span of raw) {
    const last = merged.at(-1);
    if (!last || span.from > (last.to ?? Infinity)) {
      merged.push({ ...span });
      continue;
    }
    if (last.to == null || span.to == null) last.to = null;
    else last.to = Math.max(last.to, span.to);
  }
  return merged;
}

function dayLabel(date: string, today: string, timeZone: string) {
  if (date === today) return "Today";
  return dayjs.tz(`${date} 12:00`, timeZone).format("ddd D");
}

function publish(event: RawEvent): LocktoberTimelineEvent {
  return { id: event.id, label: event.label, kind: event.kind, note: event.note };
}

function daySegments(events: RawEvent[], spans: MergedSpan[], now: number): LocktoberTimelineSegment[] {
  const sorted = [...events].sort(
    (a, b) => a.at - b.at || a.order - b.order || a.id.localeCompare(b.id),
  );
  const segments: LocktoberTimelineSegment[] = [];
  let index = 0;
  while (index < sorted.length) {
    const session = sorted[index].session;
    if (session == null) {
      segments.push({ type: "event", event: publish(sorted[index]) });
      index += 1;
      continue;
    }
    const chunk: RawEvent[] = [];
    while (index < sorted.length && sorted[index].session === session) {
      chunk.push(sorted[index]);
      index += 1;
    }
    const span = spans[session];
    const active = span.to == null || span.to > now;
    const eventsInSession = chunk.map((event) => {
      const published = publish(event);
      if (event.kind === "lock" && active) {
        published.label = activeHoursLabel(now - span.from);
      }
      return published;
    });
    if (active && !eventsInSession.some((event) => event.kind === "lock")) {
      eventsInSession.unshift({
        id: `lock-open-${session}-${chunk[0].at}`,
        kind: "lock",
        label: activeHoursLabel(now - span.from),
        note: null,
      });
    }
    segments.push({ type: "session", events: eventsInSession });
  }
  return segments;
}

/** October events grouped newest day first. Quiet days are omitted. */
export function locktoberTimeline(input: TimelineInput): LocktoberTimelineDay[] {
  const start = octoberStart(input.year, input.timeZone).valueOf();
  const end = octoberEnd(input.year, input.timeZone).valueOf();
  const now = new Date(input.now).getTime();
  const spans = mergedSpans(input.spans);
  const events: RawEvent[] = [];

  for (const completion of input.completions) {
    const at = new Date(completion.completedAt).getTime();
    if (!inOctober(at, start, end)) continue;
    events.push({
      id: completion.id,
      at,
      order: 1,
      session: sessionAt(at, spans),
      kind: completion.pointsAwarded < 0 ? "penalty" : "reward",
      label: pointsLabel(completion.title, completion.pointsAwarded),
      note: noteOrNull(completion.note),
    });
  }

  for (const day of input.cumDays) {
    if (day.status !== "CLAIMED" || !day.claimedAt) continue;
    const at = new Date(day.claimedAt).getTime();
    if (!inOctober(at, start, end)) continue;
    events.push({
      id: `claim-${day.id}`,
      at,
      order: 1,
      session: sessionAt(at, spans),
      kind: "claim",
      label: day.claimedTierLabel?.trim() || "Claimed",
      note: null,
    });
  }

  spans.forEach((span, index) => {
    if (inOctober(span.from, start, end)) {
      events.push({
        id: `lock-${index}-${span.from}`,
        at: span.from,
        order: 0,
        session: index,
        kind: "lock",
        label: "",
        note: null,
      });
    }
    if (span.to != null && inOctober(span.to, start, end)) {
      events.push({
        id: `unlock-${index}-${span.to}`,
        at: span.to,
        order: 2,
        session: index,
        kind: "unlock",
        label: sessionDurationLabel(span.to - span.from),
        note: null,
      });
    }
  });

  const today = dayjs(input.now).tz(input.timeZone).format("YYYY-MM-DD");
  const byDate = new Map<string, RawEvent[]>();
  for (const event of events) {
    const date = dayjs(event.at).tz(input.timeZone).format("YYYY-MM-DD");
    const group = byDate.get(date);
    if (group) group.push(event);
    else byDate.set(date, [event]);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, group]) => ({
      date,
      label: dayLabel(date, today, input.timeZone),
      segments: daySegments(group, spans, now),
    }));
}
