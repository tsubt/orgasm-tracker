"use client";

import ChastityStatus from "../components/ChastityStatus";
import ChallengeReplies from "./ChallengeReplies";
import EventTimeline from "./EventTimeline";
import PowerBar from "./PowerBar";
import type { SerializedChallenge } from "@/lib/locktober/load";
import {
  cumDayIsFixed,
  eligibleCumDates,
  evenlySpacedDates,
  focusYear,
  octoberEnd,
  publicLocktoberShareKey,
  hoursSinceChallengeStart,
  octoberStart,
  setupYear,
  taskCapState,
  windowIsFrozen,
} from "@/lib/locktober/scoring";
import OctoberCalendar from "./OctoberCalendar";
import PointsCalendar from "./PointsCalendar";
import TaskTile, { DeadlineMark, LockedRate, TaskGrid } from "./TaskTile";
import {
  cadencePeriod,
  compareTasksByValue,
  deadlinePassed,
  deadlineTimeValue,
  manualQuantityLimit,
  manualRateUnit,
  parseDeadlineTime,
  rateUnitWord,
  taskCardDetail,
  taskSummary,
} from "@/lib/locktober/taskLabel";
import { ClockIcon } from "@heroicons/react/24/outline";
import {
  LocktoberCadence,
  LocktoberRateUnit,
  LocktoberTaskKind,
  LocktoberTaskMode,
  LocktoberVisibility,
  OrgasmType,
  SexType,
} from "@prisma/client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  claimReward,
  completeTask,
  createChallenge,
  deleteCompletion,
  deleteTask,
  saveSchedule,
  saveTask,
  saveTiers,
  setVisibility,
  skipCumDay,
  updateCompletion,
} from "./actions";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

type ActionResult = { ok: true } | { ok: false; error: string; refresh?: boolean };

const inputClass =
  "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";
const buttonClass =
  "rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50";
const quietButtonClass =
  "rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800";

const orgasmTypes = Object.values(OrgasmType);
const sexTypes = Object.values(SexType);

function labelEnum(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function LocktoberApp({
  challenges,
  username,
  userId,
  serverNow,
  firstDayOfWeek,
  trackChastityStatus,
  activeChastity,
}: {
  challenges: SerializedChallenge[];
  username: string | null;
  userId: string;
  serverNow: string;
  firstDayOfWeek: number;
  trackChastityStatus: boolean;
  activeChastity: {
    id: string;
    startTime: string;
    endTime: null;
    note: string | null;
  } | null;
}) {
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!ready) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Loading Locktober…
      </div>
    );
  }

  const now = dayjs();
  const year = focusYear(now);
  const challenge = challenges.find((item) => item.year === year) ?? null;
  const canStart = setupYear(now) === year;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Locktober {year}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Earn points between cum days. On a cum day you claim only your highest reward, and the bar resets.
        </p>
      </div>

      <ChastityStatus
        trackChastityStatus={trackChastityStatus}
        activeSession={activeChastity}
      />

      {challenge ? (
        <ChallengeView
          challenge={challenge}
          username={username}
          userId={userId}
          serverNow={serverNow}
          firstDayOfWeek={firstDayOfWeek}
          activeChastity={activeChastity}
        />
      ) : canStart ? (
        <SetupForm year={year} firstDayOfWeek={firstDayOfWeek} />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {now.month() >= 8
            ? `Locktober ${year} setup opens in September.`
            : `You didn't join Locktober ${year}. The next one opens in September.`}
        </div>
      )}
    </div>
  );
}

function SetupForm({
  year,
  firstDayOfWeek,
}: {
  year: number;
  firstDayOfWeek: number;
}) {
  const { pending, run } = useRunner();
  const [allowed, setAllowed] = useState(1);
  const [placement, setPlacement] = useState<"even" | "random" | "choose">("even");
  const [chosen, setChosen] = useState<string[]>([]);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const count = Number.isInteger(allowed) ? allowed : 0;
  const eligible = eligibleCumDates(year, timezone, dayjs().tz(timezone));
  const evenDates = evenlySpacedDates(eligible, count);
  const past = new Set(
    Array.from({ length: 31 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return `${year}-10-${day}`;
    }).filter((date) => !eligible.includes(date)),
  );
  const notEnoughDays = count >= 1 && count <= 31 && eligible.length < count;
  const chooseReady = placement !== "choose" || chosen.length === count;
  const canStart =
    !pending &&
    count >= 1 &&
    count <= 31 &&
    !notEnoughDays &&
    chooseReady;

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canStart) return;
        void run(() =>
          createChallenge({
            timezone,
            allowedOrgasms: count,
            placement,
            dates: placement === "choose" ? chosen : undefined,
          }),
        );
      }}
    >
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Defaults: tapping release at 10 (ruined), ruined at 50, full locked at
        100, full unlocked at 200. Tasks include a daily cage check, timed
        dildo play, a weekly plugged shop, and a penalty when you break a rule.
        You can change rewards and tasks after you start.
      </p>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Orgasms allowed in October
        <input
          type="number"
          min={1}
          max={31}
          value={allowed}
          disabled={pending}
          onChange={(event) => {
            const next = Number(event.target.value);
            setAllowed(next);
            setChosen((current) => current.slice(0, Math.max(next, 0)));
          }}
          className={inputClass}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">
          Place {count >= 1 && count <= 31 ? count : "those"} cum days
        </legend>
        {(
          [
            ["even", "Distributed evenly"],
            ["random", "Distributed randomly"],
            ["choose", "Choose the days"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="placement"
              value={value}
              checked={placement === value}
              disabled={pending}
              onChange={() => setPlacement(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {notEnoughDays && (
        <p className="text-sm text-amber-700">
          Only {eligible.length} days are left in October.
        </p>
      )}

      {placement === "even" && evenDates.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Spread across the days still ahead.
          </p>
          <OctoberCalendar
            year={year}
            firstDayOfWeek={firstDayOfWeek}
            selected={evenDates}
            disabledDates={past}
            maxSelected={count}
            readOnly
          />
        </div>
      )}

      {placement === "random" && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          The {count} days are drawn once when you start. They stay where they
          land.
        </p>
      )}

      {placement === "choose" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Selected {chosen.length} of {count}.
          </p>
          <OctoberCalendar
            year={year}
            firstDayOfWeek={firstDayOfWeek}
            selected={chosen}
            disabledDates={past}
            maxSelected={count}
            readOnly={pending}
            onToggle={(date) => {
              setChosen((current) =>
                current.includes(date)
                  ? current.filter((item) => item !== date)
                  : current.length >= count
                    ? current
                    : [...current, date],
              );
            }}
          />
        </div>
      )}

      <button
        type="submit"
        className={`${buttonClass} inline-flex items-center justify-center gap-2 ${pending ? "!opacity-100" : ""}`}
        disabled={!canStart}
        aria-busy={pending}
      >
        {pending && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {pending ? "Starting…" : "Start Locktober"}
      </button>
    </form>
  );
}

function ChallengeView({
  challenge,
  username,
  userId,
  serverNow,
  firstDayOfWeek,
  activeChastity,
}: {
  challenge: SerializedChallenge;
  username: string | null;
  userId: string;
  serverNow: string;
  firstDayOfWeek: number;
  activeChastity: {
    id: string;
    startTime: string;
    endTime: null;
    note: string | null;
  } | null;
}) {
  const { pending, run } = useRunner();
  const now = dayjs().tz(challenge.timezone);
  const scoringOpen =
    !now.isBefore(octoberStart(challenge.year, challenge.timezone)) &&
    now.isBefore(octoberEnd(challenge.year, challenge.timezone));
  const editingOpen = now.isBefore(octoberEnd(challenge.year, challenge.timezone));
  const locked = challenge.bar.locked;
  const rewardPoints = challenge.bar.rewardPoints;
  const [completing, setCompleting] = useState<SerializedChallenge["tasks"][number] | null>(
    null,
  );
  const [editingLog, setEditingLog] = useState<SerializedChallenge["completions"][number] | null>(
    null,
  );
  const [claimOpen, setClaimOpen] = useState(false);

  const taskStates = challenge.tasks.map((task) => ({
    task,
    cap: taskCapState({
      taskId: task.id,
      mode: task.mode,
      cadence: task.cadence,
      maxCompletions: task.maxCompletions,
      maxPoints: task.maxPoints,
      completions: challenge.completions,
      now,
      firstDayOfWeek,
    }),
  }));

  const tasksClosedReason = !scoringOpen
    ? now.isBefore(octoberStart(challenge.year, challenge.timezone))
      ? "Tasks open on October 1."
      : "October is over."
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">Visibility</span>
          <select
            className={inputClass}
            value={challenge.visibility}
            disabled={pending}
            onChange={(event) => {
              void run(() =>
                setVisibility({
                  challengeId: challenge.id,
                  visibility: event.target.value as LocktoberVisibility,
                }),
              );
            }}
          >
            <option value="PRIVATE">Private</option>
            <option value="LINK">Anyone with the link</option>
            <option value="PUBLIC">Public board</option>
          </select>
        </label>
        <button
          type="button"
          className={quietButtonClass}
          onClick={async () => {
            const key = publicLocktoberShareKey({
              visibility: challenge.visibility,
              shareSlug: challenge.shareSlug,
              username,
            });
            const hours = hoursSinceChallengeStart(challenge.year, challenge.timezone);
            const url = `${window.location.origin}/locktober/s/${key}?v=${hours}`;
            if (challenge.visibility === "PRIVATE") {
              toast.error("Make it link-only or public before sharing.");
              return;
            }
            await navigator.clipboard.writeText(url);
            toast.success("Share link copied.");
          }}
        >
          Copy share link
        </button>
      </div>

      <PowerBar
        points={challenge.bar.points}
        tiers={challenge.bar.tiers}
        locked={locked}
        rewardPoints={challenge.bar.rewardPoints}
        rewardTiers={challenge.bar.rewardTiers}
        daysLeft={challenge.bar.daysLeft}
        onClaim={
          locked && challenge.bar.reached ? () => setClaimOpen(true) : undefined
        }
      />

      {locked && challenge.bar.cumDayDate && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
          <h2 className="font-semibold text-rose-700 dark:text-rose-200">
            {dayjs(challenge.bar.cumDayDate).format("MMMM D")} is a cum day
          </h2>
          <p className="mt-1 text-sm text-rose-800 dark:text-rose-100">
            {challenge.bar.reached
              ? `You reached ${challenge.bar.reached.label}${rewardPoints == null ? "" : ` (${rewardPoints} pts)`}. Claim it on the bar to log it. Points from today count toward the next cum day.`
              : "This cum day is Denial. Skip it if you don't want a reward. Points from today count toward the next cum day."}
          </p>
          <div className="mt-3">
            <button
              type="button"
              className={quietButtonClass}
              disabled={pending}
              onClick={() => {
                if (confirm("Skip this cum day with no reward?")) {
                  void run(() => skipCumDay(challenge.bar.cumDayId!));
                }
              }}
            >
              Skip this day
            </button>
          </div>
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <PointsCalendar
          year={challenge.year}
          firstDayOfWeek={firstDayOfWeek}
          today={now.format("YYYY-MM-DD")}
          days={challenge.calendar}
          tiers={challenge.tiers}
        />
      </section>
      <EventTimeline
        days={challenge.eventDays}
        onEdit={(id) => {
          const completion = challenge.completions.find((item) => item.id === id);
          if (completion) setEditingLog(completion);
        }}
      />

      <section className="@container rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Tasks</h2>
          {challenge.tasks
            .filter((task) => task.mode === "TIME_LOCKED")
            .map((task) => (
              <LockedRate key={task.id} task={task} />
            ))}
        </div>
        {tasksClosedReason && (
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {tasksClosedReason}
          </p>
        )}
        <TaskGrid>
          {[...taskStates]
            .filter(({ task }) => task.mode !== "TIME_LOCKED")
            .sort((a, b) => compareTasksByValue(a.task, b.task))
            .map(({ task, cap }) => {
                  const pastDeadline = deadlinePassed(
                    task.deadlineMinute,
                    now.hour(),
                    now.minute(),
                  );
                  const disabled = Boolean(tasksClosedReason) || cap.maxed;
                  const detail = cap.maxed
                    ? `${taskCardDetail(task)} · logged`
                    : pastDeadline
                      ? `${taskCardDetail(task)} · deadline passed`
                      : cap.remainingPoints != null
                        ? `${taskCardDetail(task)} · ${cap.remainingPoints}pt left`
                        : undefined;
                  return (
                    <li key={task.id} className="h-full">
                      <TaskTile
                        task={task}
                        detail={detail}
                        disabled={disabled}
                        onClick={() => setCompleting(task)}
                      />
                    </li>
                  );
            })}
        </TaskGrid>
      </section>
      <ChallengeReplies
        slug={challenge.shareSlug}
        likeCount={challenge.likeCount}
        liked={challenge.liked}
        comments={challenge.comments}
        viewerId={userId}
        isOwner
        serverNow={serverNow}
      />

      <ScheduleEditor
        key={`schedule-${challenge.updatedAt}`}
        challenge={challenge}
        disabled={!editingOpen || pending}
      />
      <TierEditor
        key={`tiers-${challenge.updatedAt}`}
        challenge={challenge}
        disabled={!editingOpen || pending}
      />
      <TaskEditor challenge={challenge} disabled={!editingOpen || pending} />

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">
          Activity
        </h2>
        {challenge.completions.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing logged yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {challenge.completions.slice(0, 30).map((completion) => (
              <li key={completion.id}>
                <button
                  type="button"
                  className="flex w-full justify-between gap-3 rounded-md px-1 py-1 text-left hover:bg-gray-50 dark:hover:bg-gray-900"
                  onClick={() => setEditingLog(completion)}
                >
                  <span>
                    {completion.title}
                    {completion.note ? ` — ${completion.note}` : ""}
                  </span>
                  <span className="shrink-0 text-gray-500">
                    {completion.pointsAwarded > 0 ? "+" : ""}
                    {completion.pointsAwarded} ·{" "}
                    {dayjs(completion.completedAt).fromNow()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editingLog && (
        <EditLogModal
          completion={editingLog}
          task={challenge.tasks.find((task) => task.id === editingLog.taskId) ?? null}
          completions={challenge.completions}
          year={challenge.year}
          timezone={challenge.timezone}
          cumDays={challenge.cumDays}
          firstDayOfWeek={firstDayOfWeek}
          onClose={() => setEditingLog(null)}
        />
      )}
      {completing && (
        <CompleteModal
          task={completing}
          completions={challenge.completions}
          timezone={challenge.timezone}
          firstDayOfWeek={firstDayOfWeek}
          onClose={() => setCompleting(null)}
        />
      )}
      {claimOpen && challenge.bar.reached && challenge.bar.cumDayId && (
        <ClaimModal
          cumDayId={challenge.bar.cumDayId}
          tier={challenge.bar.reached}
          activeChastity={activeChastity}
          onClose={() => setClaimOpen(false)}
        />
      )}
    </div>
  );
}

function ScheduleEditor({
  challenge,
  disabled,
}: {
  challenge: SerializedChallenge;
  disabled: boolean;
}) {
  const { pending, run } = useRunner();
  const [allowed, setAllowed] = useState(challenge.allowedOrgasms);
  const [dates, setDates] = useState(challenge.cumDays.map((day) => day.date));

  const now = dayjs().tz(challenge.timezone);
  const fixedDates = new Set(
    challenge.cumDays
      .filter((day) => cumDayIsFixed(day, challenge.timezone, now))
      .map((day) => day.date),
  );
  const earliestUpcoming =
    eligibleCumDates(challenge.year, challenge.timezone, now)[0] ??
    `${challenge.year}-10-31`;

  return (
    <details className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <summary className="cursor-pointer font-semibold">Cum days and allowance</summary>
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(() =>
            saveSchedule({
              challengeId: challenge.id,
              allowedOrgasms: allowed,
              dates: dates.filter(Boolean),
            }),
          );
        }}
      >
        <p className="text-xs text-gray-500">
          Days that have already started stay as they are.
        </p>
        <label className="flex flex-col gap-1 text-sm">
          Orgasms allowed
          <input
            type="number"
            min={Math.max(1, fixedDates.size)}
            max={31}
            value={allowed}
            disabled={disabled}
            onChange={(event) => setAllowed(Number(event.target.value))}
            className={inputClass}
          />
        </label>
        {dates.map((date, index) => (
          <div key={`${date}-${index}`} className="flex gap-2">
            <input
              type="date"
              min={fixedDates.has(date) ? `${challenge.year}-10-01` : earliestUpcoming}
              max={`${challenge.year}-10-31`}
              value={date}
              disabled={disabled || fixedDates.has(date)}
              onChange={(event) => {
                const value = event.target.value;
                if (
                  value &&
                  cumDayIsFixed(
                    { date: value, status: "SCHEDULED" },
                    challenge.timezone,
                    dayjs().tz(challenge.timezone),
                  )
                ) {
                  return;
                }
                const next = [...dates];
                next[index] = value;
                setDates(next);
              }}
              className={inputClass}
            />
            {!fixedDates.has(date) && (
              <button
                type="button"
                className={quietButtonClass}
                disabled={disabled}
                onClick={() => setDates(dates.filter((_, item) => item !== index))}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {dates.filter(Boolean).length < allowed && (
          <button
            type="button"
            className={quietButtonClass}
            disabled={disabled}
            onClick={() => setDates([...dates, ""])}
          >
            Add cum day
          </button>
        )}
        <button type="submit" className={buttonClass} disabled={disabled || pending}>
          Save schedule
        </button>
      </form>
    </details>
  );
}

function TierEditor({
  challenge,
  disabled,
}: {
  challenge: SerializedChallenge;
  disabled: boolean;
}) {
  const { pending, run } = useRunner();
  const [tiers, setTiers] = useState(
    challenge.tiers.map((tier) => ({
      label: tier.label,
      points: tier.points,
      orgasmType: tier.orgasmType,
      expectsLocked: tier.expectsLocked,
    })),
  );

  return (
    <details className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <summary className="cursor-pointer font-semibold">Reward tiers</summary>
      <p className="mt-2 text-xs text-gray-500">
        Changes apply to the open cycle. A locked cum day keeps the tiers it
        locked with. Tapping release and ruined both log a ruined orgasm.
      </p>
      <form
        className="mt-3 flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(() => saveTiers({ challengeId: challenge.id, tiers }));
        }}
      >
        {tiers.map((tier, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem_auto_auto]">
            <input
              value={tier.label}
              disabled={disabled}
              onChange={(event) => {
                const next = [...tiers];
                next[index] = { ...tier, label: event.target.value };
                setTiers(next);
              }}
              className={inputClass}
              placeholder="Label"
            />
            <input
              type="number"
              min={1}
              value={tier.points}
              disabled={disabled}
              onChange={(event) => {
                const next = [...tiers];
                next[index] = { ...tier, points: Number(event.target.value) };
                setTiers(next);
              }}
              className={inputClass}
            />
            <select
              value={tier.orgasmType ?? ""}
              disabled={disabled}
              onChange={(event) => {
                const next = [...tiers];
                next[index] = {
                  ...tier,
                  orgasmType: (event.target.value || null) as OrgasmType | null,
                };
                setTiers(next);
              }}
              className={inputClass}
            >
              <option value="">No orgasm</option>
              {orgasmTypes.map((type) => (
                <option key={type} value={type}>
                  {labelEnum(type)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={tier.expectsLocked}
                disabled={disabled || !tier.orgasmType}
                onChange={(event) => {
                  const next = [...tiers];
                  next[index] = { ...tier, expectsLocked: event.target.checked };
                  setTiers(next);
                }}
              />
              Locked
            </label>
            <button
              type="button"
              className={quietButtonClass}
              disabled={disabled}
              onClick={() => setTiers(tiers.filter((_, item) => item !== index))}
            >
              Remove
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <button
            type="button"
            className={quietButtonClass}
            disabled={disabled}
            onClick={() =>
              setTiers([
                ...tiers,
                {
                  label: "New reward",
                  points: (tiers.at(-1)?.points ?? 0) + 10,
                  orgasmType: "RUINED",
                  expectsLocked: true,
                },
              ])
            }
          >
            Add tier
          </button>
          <button type="submit" className={buttonClass} disabled={disabled || pending}>
            Save rewards
          </button>
        </div>
      </form>
    </details>
  );
}

function TaskEditor({
  challenge,
  disabled,
}: {
  challenge: SerializedChallenge;
  disabled: boolean;
}) {
  const [tab, setTab] = useState<LocktoberTaskKind>("REWARD");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const tasks = challenge.tasks.filter((task) => task.kind === tab);
  const noun = tab === "REWARD" ? "task" : "penalty";

  return (
    <details className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <summary className="cursor-pointer font-semibold">Edit tasks and penalties</summary>
      <p className="mt-2 text-xs text-gray-500">
        Past completions keep the points they earned. Time locked uses the
        current rate for the open cycle and only counts whole periods.
      </p>
      <div className="mt-3 flex gap-2">
        {(
          [
            ["REWARD", "Tasks"],
            ["PENALTY", "Penalties"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTab(value);
              setEditingId(null);
            }}
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              tab === value
                ? "bg-pink-500 text-white"
                : "border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {tasks.length === 0 && editingId !== "new" && (
          <li className="text-sm text-gray-500">
            {tab === "REWARD" ? "No tasks yet." : "No penalties yet."}
          </li>
        )}
        {tasks.map((task) =>
          editingId === task.id ? (
            <li key={task.id}>
              <TaskForm
                key={`${task.id}-${challenge.updatedAt}`}
                challengeId={challenge.id}
                task={task}
                kind={tab}
                disabled={disabled}
                onClose={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li
              key={task.id}
              className="flex items-start justify-between gap-3 border-b border-gray-100 py-2 dark:border-gray-700"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 font-medium text-gray-900 dark:text-white">
                  {task.title}
                  {task.deadlineMinute != null && (
                    <DeadlineMark
                      minute={task.deadlineMinute}
                      penalty={task.missPenalty}
                      className="text-xs font-normal text-gray-500"
                    />
                  )}
                </div>
                <div className="text-sm text-gray-500">{taskSummary(task)}</div>
                {task.description ? (
                  <div className="line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                    {task.description}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className={quietButtonClass}
                disabled={disabled || editingId != null}
                onClick={() => setEditingId(task.id)}
              >
                Edit
              </button>
            </li>
          ),
        )}
      </ul>
      {editingId === "new" ? (
        <div className="mt-3">
          <TaskForm
            challengeId={challenge.id}
            kind={tab}
            disabled={disabled}
            onClose={() => setEditingId(null)}
          />
        </div>
      ) : (
        <button
          type="button"
          className={`${quietButtonClass} mt-3`}
          disabled={disabled || editingId != null}
          onClick={() => setEditingId("new")}
        >
          Add {noun}
        </button>
      )}
    </details>
  );
}

function startingRateUnit(
  task: SerializedChallenge["tasks"][number] | undefined,
): LocktoberRateUnit {
  if (!task) return "HOUR";
  if (task.mode === "PER_MINUTE") {
    if (task.rateUnit === "SECOND" || task.rateUnit === "MINUTE" || task.rateUnit === "HOUR") {
      return task.rateUnit;
    }
    return "MINUTE";
  }
  if (
    task.rateUnit === "SECOND" ||
    task.rateUnit === "MINUTE" ||
    task.rateUnit === "HOUR" ||
    task.rateUnit === "DAY"
  ) {
    return task.rateUnit;
  }
  return "HOUR";
}

function blankNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number(trimmed);
}

function TaskForm({
  challengeId,
  task,
  kind,
  disabled,
  onClose,
}: {
  challengeId: string;
  task?: SerializedChallenge["tasks"][number];
  kind: LocktoberTaskKind;
  disabled: boolean;
  onClose: () => void;
}) {
  const { pending, run } = useRunner();
  const noun = kind === "REWARD" ? "task" : "penalty";
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [mode, setMode] = useState<LocktoberTaskMode>(
    task?.mode ?? (kind === "PENALTY" ? "ENTER_AMOUNT" : "FIXED"),
  );
  const [cadence, setCadence] = useState<LocktoberCadence>(task?.cadence ?? "DAILY");
  const [points, setPoints] = useState(Math.abs(task?.points ?? 1));
  const [attemptLimit, setAttemptLimit] = useState(
    task ? (task.maxCompletions == null ? "" : String(task.maxCompletions)) : "1",
  );
  const [maxPoints, setMaxPoints] = useState(
    task?.maxPoints == null ? "" : String(task.maxPoints),
  );
  const [noteRequired, setNoteRequired] = useState(task?.noteRequired ?? false);
  const [deadline, setDeadline] = useState(
    task?.deadlineMinute == null ? "" : deadlineTimeValue(task.deadlineMinute),
  );
  const [missPenalty, setMissPenalty] = useState(String(task?.missPenalty ?? 0));
  const [rateEvery, setRateEvery] = useState(task?.rateEvery ?? 1);
  const [rateUnit, setRateUnit] = useState<LocktoberRateUnit>(startingRateUnit(task));
  const auto = mode === "TIME_LOCKED";
  const rated = mode === "PER_MINUTE";
  const chosen = mode === "ENTER_AMOUNT";
  const period = cadencePeriod(cadence);
  const noteLocked = kind === "PENALTY" && chosen;
  const perUnit: LocktoberRateUnit = rated && rateUnit === "DAY" ? "HOUR" : rateUnit;
  const deadlineMinute = parseDeadlineTime(deadline);
  const penaltyPreview = Number.isInteger(Number(missPenalty)) ? Number(missPenalty) : 0;
  const modes: { value: LocktoberTaskMode; label: string }[] = [
    { value: "FIXED", label: "Fixed points" },
    { value: "PER_MINUTE", label: "Points per time" },
    { value: "ENTER_AMOUNT", label: "Amount entered when done" },
    ...(kind === "REWARD"
      ? [{ value: "TIME_LOCKED" as const, label: "Time locked (automatic)" }]
      : []),
  ];
  const unitOptions = auto
    ? (["SECOND", "MINUTE", "HOUR", "DAY"] as const)
    : (["SECOND", "MINUTE", "HOUR"] as const);
  const caption = "text-xs font-medium text-gray-900 dark:text-white";

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900"
      onSubmit={(event) => {
        event.preventDefault();
        const parsedPoints = blankNumber(maxPoints);
        const parsedAttempts = blankNumber(attemptLimit);
        void run(async () => {
          const result = await saveTask({
            challengeId,
            taskId: task?.id,
            title,
            description,
            kind,
            mode,
            cadence,
            points: chosen ? null : points,
            maxCompletions: auto ? null : parsedAttempts,
            maxPoints: rated || chosen ? parsedPoints : null,
            noteRequired: noteLocked ? true : noteRequired,
            deadlineMinute: auto ? null : deadlineMinute,
            missPenalty: auto || deadlineMinute == null ? 0 : Number(missPenalty),
            rateEvery: auto ? rateEvery : null,
            rateUnit: auto || rated ? perUnit : null,
          });
          if (result.ok) onClose();
          return result;
        });
      }}
    >
      <label className="flex flex-col gap-1">
        <span className={caption}>Title</span>
        <input
          value={title}
          disabled={disabled}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={task ? "Title" : `New ${noun}`}
          className={inputClass}
          required
        />
      </label>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-44 flex-1 flex-col gap-1">
          <span className={caption}>How points work</span>
          <select
            value={mode}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value as LocktoberTaskMode;
              setMode(next);
              if (next === "PER_MINUTE" && rateUnit === "DAY") setRateUnit("HOUR");
            }}
            className={inputClass}
          >
            {modes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {!chosen && (
          <label className="flex w-24 flex-col gap-1">
            <span className={caption}>Points</span>
            <input
              type="number"
              min={1}
              value={points}
              disabled={disabled}
              onChange={(event) => setPoints(Number(event.target.value))}
              className={inputClass}
              required
            />
          </label>
        )}
        {(rated || auto) && (
          <>
            {auto && (
              <label className="flex w-20 flex-col gap-1">
                <span className={caption}>Every</span>
                <input
                  type="number"
                  min={1}
                  value={rateEvery}
                  disabled={disabled}
                  onChange={(event) => setRateEvery(Number(event.target.value))}
                  className={inputClass}
                  required
                />
              </label>
            )}
            <label className="flex w-32 flex-col gap-1">
              <span className={caption}>Per</span>
              <select
                value={perUnit}
                disabled={disabled}
                onChange={(event) => setRateUnit(event.target.value as LocktoberRateUnit)}
                className={inputClass}
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {rateUnitWord(unit, auto ? rateEvery : 1)}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      {auto && (
        <p className="text-xs text-gray-500">
          Counts locked time in this cycle and only awards whole periods. 59 minutes at 1 per hour
          is 0 points.
        </p>
      )}

      {!auto && (
        <div className="flex flex-wrap items-end gap-2">
          {rated || chosen ? (
            <label className="flex w-28 flex-col gap-1">
              <span className={caption}>Max points</span>
              <input
                type="number"
                min={1}
                value={maxPoints}
                disabled={disabled}
                placeholder="No cap"
                onChange={(event) => setMaxPoints(event.target.value)}
                className={inputClass}
              />
            </label>
          ) : (
            <label className="flex w-28 flex-col gap-1">
              <span className={caption}>Max times</span>
              <input
                type="number"
                min={1}
                value={attemptLimit}
                disabled={disabled}
                onChange={(event) => setAttemptLimit(event.target.value)}
                className={inputClass}
                required
              />
            </label>
          )}
          {(rated || chosen) && (
            <label className="flex w-32 flex-col gap-1">
              <span className={caption}>Max attempts</span>
              <input
                type="number"
                min={1}
                value={attemptLimit}
                disabled={disabled}
                placeholder="No limit"
                onChange={(event) => setAttemptLimit(event.target.value)}
                className={inputClass}
              />
            </label>
          )}
          <label className="flex w-36 flex-col gap-1">
            <span className={caption}>Per</span>
            <select
              value={cadence}
              disabled={disabled}
              onChange={(event) => setCadence(event.target.value as LocktoberCadence)}
              className={inputClass}
            >
              <option value="DAILY">Day</option>
              <option value="WEEKLY">Week</option>
              <option value="MONTHLY">Month</option>
            </select>
          </label>
        </div>
      )}
      {(rated || chosen) && (
        <p className="text-xs text-gray-500">
          Leave either blank for no limit. A point cap can be split across attempts, like 10 then 5.
        </p>
      )}

      {!auto && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex w-36 flex-col gap-1">
            <span className={`${caption} inline-flex items-center gap-1`}>
              <ClockIcon className="size-3.5" aria-hidden />
              Deadline
            </span>
            <input
              type="time"
              value={deadline}
              disabled={disabled}
              onChange={(event) => setDeadline(event.target.value)}
              className={inputClass}
            />
          </label>
          {deadline !== "" && (
            <label className="flex w-28 flex-col gap-1">
              <span className={caption}>Penalty</span>
              <input
                type="number"
                min={0}
                max={500}
                step={1}
                value={missPenalty}
                disabled={disabled}
                onChange={(event) => setMissPenalty(event.target.value)}
                className={inputClass}
              />
            </label>
          )}
          {deadlineMinute != null && (
            <DeadlineMark
              minute={deadlineMinute}
              penalty={penaltyPreview > 0 ? penaltyPreview : 0}
              className="mb-2 text-sm text-gray-700 dark:text-gray-200"
            />
          )}
        </div>
      )}
      <label className="flex flex-col gap-1">
        <span className={caption}>Description</span>
        <textarea
          value={description}
          disabled={disabled}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Longer explanation, shown on the task and when logging it"
          className={inputClass}
          rows={3}
          maxLength={2000}
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {!auto ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={noteLocked || noteRequired}
              disabled={disabled || noteLocked}
              onChange={(event) => setNoteRequired(event.target.checked)}
            />
            <span>
              Note required
              {noteLocked ? " — penalties with a chosen amount always need one" : ""}
            </span>
          </label>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={buttonClass} disabled={disabled || pending}>
            Save
          </button>
          {task && (
            <button
              type="button"
              className={quietButtonClass}
              disabled={disabled || pending}
              onClick={() => {
                if (confirm(`Delete “${task.title}”? Past logs stay.`)) {
                  void run(async () => {
                    const result = await deleteTask(task.id);
                    if (result.ok) onClose();
                    return result;
                  });
                }
              }}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            className={quietButtonClass}
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

function EditLogModal({
  completion,
  task,
  completions,
  year,
  timezone,
  cumDays,
  firstDayOfWeek,
  onClose,
}: {
  completion: SerializedChallenge["completions"][number];
  task: SerializedChallenge["tasks"][number] | null;
  completions: SerializedChallenge["completions"];
  year: number;
  timezone: string;
  cumDays: SerializedChallenge["cumDays"];
  firstDayOfWeek: number;
  onClose: () => void;
}) {
  const { pending, run } = useRunner();
  const scored = dayjs(completion.completedAt).tz(timezone);
  const [date, setDate] = useState(scored.format("YYYY-MM-DD"));
  const [time, setTime] = useState(scored.format("HH:mm"));
  const [note, setNote] = useState(completion.note ?? "");
  const mode = task?.mode ?? completion.mode;
  const kind = task?.kind ?? completion.kind;
  const rate = Math.abs(task?.points ?? completion.rate ?? 0);
  const [quantity, setQuantity] = useState(
    rate > 0
      ? Math.max(1, Math.round(Math.abs(completion.pointsAwarded) / rate))
      : Math.max(1, completion.minutes ?? 1),
  );
  const [amount, setAmount] = useState(Math.max(1, Math.abs(completion.pointsAwarded) || 1));
  const effective = dayjs.tz(`${date} ${time}`, timezone);
  const frozen = windowIsFrozen(year, timezone, cumDays, scored);
  const cap = task
    ? taskCapState({
        taskId: task.id,
        mode: task.mode,
        cadence: task.cadence,
        maxCompletions: task.maxCompletions,
        maxPoints: task.maxPoints,
        completions: completions.filter((item) => item.id !== completion.id),
        now: effective.isValid() ? effective : scored,
        firstDayOfWeek,
      })
    : null;
  const editablePoints = !completion.deadlineMiss && task != null && task.mode !== "TIME_LOCKED";
  const unit = manualRateUnit(task?.rateUnit);
  const unitLimit = manualQuantityLimit(unit);
  const unitName = rateUnitWord(unit, 2);
  const remainingPoints = cap?.remainingPoints ?? null;
  const pointLimited = mode === "PER_MINUTE" && remainingPoints != null && rate > 0;
  const maxQuantity = pointLimited
    ? Math.min(unitLimit, Math.max(1, Math.floor(remainingPoints / rate)))
    : unitLimit;
  const amountMax = remainingPoints == null ? 500 : Math.max(1, Math.min(500, remainingPoints));
  const moved = !effective.isValid() || Math.abs(effective.valueOf() - new Date(completion.enteredAt).getTime()) >= 60_000;
  const noteNeeded = Boolean(task?.noteRequired) || moved;

  return (
    <Modal title={completion.title} onClose={onClose}>
      {frozen ? (
        <p className="text-sm text-gray-600">
          This log is in a claimed or skipped window, so it stays as it is.
        </p>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              if (!effective.isValid()) return { ok: false, error: "Enter a valid date and time." };
              const result = await updateCompletion({
                completionId: completion.id,
                note,
                completedAt: effective.toISOString(),
                quantity: editablePoints && mode === "PER_MINUTE" ? quantity : undefined,
                amount: editablePoints && mode === "ENTER_AMOUNT" ? amount : undefined,
              });
              if (result.ok) onClose();
              return result;
            });
          }}
        >
          {completion.deadlineMiss ? (
            <p className="text-sm text-gray-600">This penalty was added automatically.</p>
          ) : null}
          {editablePoints && mode === "PER_MINUTE" && (
            <label className="flex flex-col gap-1 text-sm">
              {unitName.charAt(0).toUpperCase() + unitName.slice(1)}
              <input
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className={inputClass}
                required
              />
            </label>
          )}
          {editablePoints && mode === "ENTER_AMOUNT" && (
            <label className="flex flex-col gap-1 text-sm">
              {kind === "PENALTY" ? "Points to remove" : "Points to add"}
              <input
                type="number"
                min={1}
                max={amountMax}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className={inputClass}
                required
              />
            </label>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-sm">
              Date
              <input
                type="date"
                value={date}
                min={`${year}-10-01`}
                max={`${year}-10-31`}
                onChange={(event) => setDate(event.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Time
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className={inputClass}
                required
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Note{noteNeeded ? "" : " (optional)"}
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={inputClass}
              rows={3}
              required={noteNeeded}
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="text-sm font-semibold text-rose-600 hover:underline disabled:opacity-50"
              disabled={pending}
              onClick={() => {
                if (!confirm("Delete this log?")) return;
                void run(async () => {
                  const result = await deleteCompletion(completion.id);
                  if (result.ok) onClose();
                  return result;
                });
              }}
            >
              Delete
            </button>
            <button type="submit" className={buttonClass} disabled={pending}>
              Save
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function CompleteModal({
  task,
  completions,
  timezone,
  firstDayOfWeek,
  onClose,
}: {
  task: SerializedChallenge["tasks"][number];
  completions: SerializedChallenge["completions"];
  timezone: string;
  firstDayOfWeek: number;
  onClose: () => void;
}) {
  const { pending, run } = useRunner();
  const zoneNow = dayjs().tz(timezone);
  const [date, setDate] = useState(zoneNow.format("YYYY-MM-DD"));
  const [time, setTime] = useState(zoneNow.format("HH:mm"));
  const [override, setOverride] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState("");
  const effective = override ? dayjs.tz(`${date} ${time}`, timezone) : zoneNow;
  const cap = taskCapState({
    taskId: task.id,
    mode: task.mode,
    cadence: task.cadence,
    maxCompletions: task.maxCompletions,
    maxPoints: task.maxPoints,
    completions,
    now: effective.isValid() ? effective : zoneNow,
    firstDayOfWeek,
  });
  const remainingPoints = cap.remainingPoints;
  const noteNeeded = override || task.noteRequired;
  const rate = Math.abs(task.points ?? 1);
  const unit = manualRateUnit(task.rateUnit);
  const unitLimit = manualQuantityLimit(unit);
  const unitName = rateUnitWord(unit, 2);
  const pointLimited = task.mode === "PER_MINUTE" && remainingPoints != null;
  const maxQuantity = pointLimited
    ? Math.min(unitLimit, Math.floor(remainingPoints / rate))
    : unitLimit;
  const amountMax = remainingPoints == null ? 500 : Math.min(500, remainingPoints);

  return (
    <Modal title={task.title} onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            if (override && !effective.isValid()) {
              return { ok: false, error: "Enter a valid date and time." };
            }
            const result = await completeTask({
              taskId: task.id,
              quantity: task.mode === "PER_MINUTE" ? quantity : undefined,
              amount: task.mode === "ENTER_AMOUNT" ? amount : undefined,
              note,
              completedAt: override ? effective.toISOString() : undefined,
            });
            if (result.ok) onClose();
            return result;
          });
        }}
      >
        {task.description ? (
          <p className="whitespace-pre-wrap text-sm text-gray-800">{task.description}</p>
        ) : null}
        <p className="text-sm text-gray-600">{taskSummary(task)}</p>
        {task.mode === "PER_MINUTE" && maxQuantity < 1 && (
          <p className="text-sm text-gray-600">Not enough points left for another one.</p>
        )}
        {task.mode === "PER_MINUTE" && maxQuantity >= 1 && (
          <label className="flex flex-col gap-1 text-sm">
            {unitName.charAt(0).toUpperCase() + unitName.slice(1)}
            <input
              type="number"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className={inputClass}
              required
            />
          </label>
        )}
        {task.mode === "ENTER_AMOUNT" && (
          <label className="flex flex-col gap-1 text-sm">
            {task.kind === "PENALTY" ? "Points to remove" : "Points to add"}
            <input
              type="number"
              min={1}
              max={Math.max(1, amountMax)}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              className={inputClass}
              required
            />
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
              disabled={!override}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Time
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className={inputClass}
              disabled={!override}
              required
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={override}
            onChange={(event) => {
              const next = event.target.checked;
              if (next) {
                const current = dayjs().tz(timezone);
                setDate(current.format("YYYY-MM-DD"));
                setTime(current.format("HH:mm"));
              }
              setOverride(next);
            }}
          />
          Override time
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Note{noteNeeded ? "" : " (optional)"}
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={inputClass}
            rows={3}
            required={noteNeeded}
          />
        </label>
        <button
          type="submit"
          className={buttonClass}
          disabled={pending || (task.mode === "PER_MINUTE" && maxQuantity < 1)}
        >
          Confirm
        </button>
      </form>
    </Modal>
  );
}

function ClaimModal({
  cumDayId,
  tier,
  activeChastity,
  onClose,
}: {
  cumDayId: string;
  tier: NonNullable<SerializedChallenge["bar"]["reached"]>;
  activeChastity: {
    id: string;
    startTime: string;
    endTime: null;
    note: string | null;
  } | null;
  onClose: () => void;
}) {
  const { pending, run } = useRunner();
  const today = dayjs();
  const [date, setDate] = useState(today.format("YYYY-MM-DD"));
  const [time, setTime] = useState(today.format("HH:mm"));
  const [type, setType] = useState<OrgasmType>(tier.orgasmType ?? "FULL");
  const [sex, setSex] = useState<SexType>("SOLO");
  const [note, setNote] = useState(`Locktober: ${tier.label}`);
  const offerEnd =
    tier.orgasmType === "FULL" && !tier.expectsLocked && activeChastity != null;
  const [endChastity, setEndChastity] = useState(offerEnd);

  return (
    <Modal title={tier.label} onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            let orgasm = null;
            if (tier.orgasmType) {
              const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
              const timestamp = dayjs.tz(`${date} ${time}`, zone).utc().toISOString();
              orgasm = { timestamp, type, sex, note, endChastity };
            }
            const result = await claimReward({ cumDayId, orgasm });
            if (result.ok) {
              toast.success("Reward logged.");
              onClose();
            }
            return result;
          });
        }}
      >
        <p className="text-sm text-gray-600">
          Completing this logs {tier.label}. The bar already reset at midnight.
        </p>
        {tier.expectsLocked && !activeChastity && (
          <p className="text-sm text-amber-700">
            This reward expects you to be locked. You can still log it.
          </p>
        )}
        {tier.orgasmType ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={inputClass}
                required
              />
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className={inputClass}
                required
              />
            </div>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as OrgasmType)}
              className={inputClass}
            >
              {orgasmTypes.map((item) => (
                <option key={item} value={item}>
                  {labelEnum(item)}
                </option>
              ))}
            </select>
            <select
              value={sex}
              onChange={(event) => setSex(event.target.value as SexType)}
              className={inputClass}
            >
              {sexTypes.map((item) => (
                <option key={item} value={item}>
                  {labelEnum(item)}
                </option>
              ))}
            </select>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={inputClass}
              rows={3}
            />
            {offerEnd && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={endChastity}
                  onChange={(event) => setEndChastity(event.target.checked)}
                />
                End chastity session
              </label>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-600">
            This reward doesn&apos;t log an orgasm. Claiming it records the locked reward.
          </p>
        )}
        <button type="submit" className={buttonClass} disabled={pending}>
          Complete reward
        </button>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-5 text-gray-900 shadow-xl">
        <h3 className="mb-3 text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function useRunner() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<ActionResult>) {
    setPending(true);
    try {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        if (result.refresh) router.refresh();
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return { pending, run };
}
