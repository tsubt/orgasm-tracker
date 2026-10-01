"use client";

import PowerBar from "../../PowerBar";
import PointsCalendar from "../../PointsCalendar";
import TaskTile, { TaskGrid } from "../../TaskTile";
import type { LocktoberCalendarDay } from "@/lib/locktober/calendar";
import type { SerializedTask } from "@/lib/locktober/load";
import { compareTasksByValue } from "@/lib/locktober/taskLabel";
import { BarView, TierSnapshot } from "@/lib/locktober/scoring";
import { onDate } from "@/lib/zonedTime";
import { RelativeTime, TheirTime } from "@/app/components/SubjectTime";
import { LocktoberCumDayStatus } from "@prisma/client";
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
  cumDays,
  likeCount,
  liked,
  comments,
  viewerId,
  isOwner,
  timeZone,
  serverNow,
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
  cumDays: {
    date: string;
    status: LocktoberCumDayStatus;
    claimedTierLabel: string | null;
    pointsAtLock: number | null;
  }[];
  likeCount: number;
  liked: boolean;
  comments: ShareComment[];
  viewerId: string | null;
  isOwner: boolean;
  timeZone: string;
  serverNow: string;
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
        <p className="text-sm text-gray-500">
          {bar.locked ? "Cum day" : "In progress"}
          {bar.reached ? ` · ${bar.reached.label}` : ""}
        </p>
        <TheirTime timeZone={timeZone} serverNow={serverNow} own={isOwner} />
      </div>

      <PowerBar
        points={bar.points}
        tiers={bar.tiers}
        locked={bar.locked}
        daysLeft={bar.daysLeft}
      />

      <PointsCalendar
        year={year}
        firstDayOfWeek={firstDayOfWeek}
        today={today}
        days={calendar}
        tiers={tiers}
      />
      <TaskList tasks={tasks} />

      <ul className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-300">
        {cumDays.map((day) => (
          <li
            key={day.date}
            className="rounded-full border border-gray-300 px-3 py-1 dark:border-gray-600"
          >
            {onDate(day.date, timeZone).format("MMM D")} · {day.status.toLowerCase()}
            {day.claimedTierLabel ? ` · ${day.claimedTierLabel}` : ""}
          </li>
        ))}
      </ul>

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
  if (tasks.length === 0) return null;
  const ordered = [...tasks].sort(compareTasksByValue);

  return (
    <section className="@container">
      <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Tasks</h2>
      <TaskGrid>
        {ordered.map((task) => (
          <li key={task.id} className="h-full">
            <TaskTile task={task} />
          </li>
        ))}
      </TaskGrid>
    </section>
  );
}
