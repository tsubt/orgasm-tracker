"use client";

import EventTimeline from "../../EventTimeline";
import PowerBar from "../../PowerBar";
import PointsCalendar from "../../PointsCalendar";
import TaskTile, { TaskGrid } from "../../TaskTile";
import type { LocktoberCalendarDay } from "@/lib/locktober/calendar";
import type { SerializedTask } from "@/lib/locktober/load";
import { countdownReward, countLabel, daysLeftPhrase, lockedHoursLabel } from "@/lib/locktober/shareLine";
import { compareTasksByValue, taskSummary } from "@/lib/locktober/taskLabel";
import { BarView, TierSnapshot } from "@/lib/locktober/scoring";
import type { LocktoberTimelineDay } from "@/lib/locktober/timeline";
import { RelativeTime, TheirTime } from "@/app/components/SubjectTime";
import { LockClosedIcon } from "@heroicons/react/24/solid";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { addComment, deleteComment, toggleLike } from "../../actions";

dayjs.extend(utc);
dayjs.extend(timezone);

export type ShareComment = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  username: string | null;
  name: string | null;
};

const inputClass =
  "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500";
const buttonClass =
  "rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white hover:bg-pink-600 disabled:opacity-50";

export default function ShareView({
  slug,
  year,
  username,
  name,
  bar,
  tasks,
  calendar,
  tiers,
  firstDayOfWeek,
  likeCount,
  liked,
  comments,
  viewerId,
  isOwner,
  timeZone,
  serverNow,
  eventDays,
}: {
  slug: string;
  year: number;
  username: string | null;
  name: string | null;
  bar: BarView;
  tasks: SerializedTask[];
  calendar: LocktoberCalendarDay[];
  tiers: TierSnapshot[];
  firstDayOfWeek: number;
  likeCount: number;
  liked: boolean;
  comments: ShareComment[];
  viewerId: string | null;
  isOwner: boolean;
  timeZone: string;
  serverNow: string;
  eventDays: LocktoberTimelineDay[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const display = username ? `@${username}` : name || "Someone";
  const today = dayjs(serverNow).tz(timeZone).format("YYYY-MM-DD");

  async function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setPending(true);
    try {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setBody("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {display}&apos;s Locktober {year}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
          <span className="inline-flex items-center gap-1">
            <LockClosedIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {lockedHoursLabel(calendar)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rotate-45 border-2"
              style={{ backgroundColor: "#f0c014", borderColor: "#a16207" }}
              aria-hidden
            />
            {countLabel(bar.points, "point", "points")}
          </span>
          {bar.daysLeft != null && (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>💦</span>
              {daysLeftPhrase(bar.daysLeft, countdownReward(bar.points, bar.tiers))}
            </span>
          )}
        </p>
        <TheirTime timeZone={timeZone} serverNow={serverNow} own={isOwner} />
      </div>

      <PowerBar
        points={bar.points}
        tiers={bar.tiers}
        locked={bar.locked}
        rewardPoints={bar.rewardPoints}
        rewardTiers={bar.rewardTiers}
        daysLeft={bar.daysLeft}
      />

      <PointsCalendar
        year={year}
        firstDayOfWeek={firstDayOfWeek}
        today={today}
        days={calendar}
        tiers={tiers}
      />
      <EventTimeline days={eventDays} />
      <TaskList tasks={tasks} />

      <div className="flex items-center gap-3">
        <button
          type="button"
          className={buttonClass}
          disabled={!viewerId || pending}
          onClick={() => void run(() => toggleLike(slug))}
        >
          {liked ? "Unlike" : "Like"} · {likeCount}
        </button>
        {!viewerId && (
          <span className="text-sm text-gray-500">Sign in to like or comment.</span>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Comments</h2>
        {comments.length === 0 && (
          <p className="text-sm text-gray-500">No comments yet.</p>
        )}
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                <span>
                  {comment.username ? `@${comment.username}` : comment.name || "Someone"}
                  {" · "}
                  <RelativeTime at={comment.createdAt} serverNow={serverNow} />
                </span>
                {viewerId && (comment.userId === viewerId || isOwner) && (
                  <button
                    type="button"
                    className="underline"
                    disabled={pending}
                    onClick={() => void run(() => deleteComment(comment.id))}
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
        {viewerId && (
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void run(() => addComment(slug, body));
            }}
          >
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Say something"
              className={inputClass}
            />
            <button type="submit" className={buttonClass} disabled={pending || !body.trim()}>
              Comment
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function TaskList({ tasks }: { tasks: SerializedTask[] }) {
  const [open, setOpen] = useState<SerializedTask | null>(null);
  if (tasks.length === 0) return null;
  const ordered = [...tasks].sort(compareTasksByValue);

  return (
    <section className="@container">
      <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Tasks</h2>
      <TaskGrid>
        {ordered.map((task) => (
          <li key={task.id} className="h-full">
            <TaskTile task={task} onClick={() => setOpen(task)} />
          </li>
        ))}
      </TaskGrid>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(null);
          }}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 text-gray-900 shadow-xl dark:bg-gray-900 dark:text-gray-100">
            <h3 className="text-lg font-semibold">{open.title}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{taskSummary(open)}</p>
            {open.description ? (
              <p className="mt-3 whitespace-pre-wrap text-sm">{open.description}</p>
            ) : null}
            <button
              type="button"
              className={`${buttonClass} mt-4`}
              onClick={() => setOpen(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
