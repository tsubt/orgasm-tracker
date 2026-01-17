"use client";

import { useState, useMemo } from "react";
import { Orgasm, ChastitySession } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(duration);

// Color palette matching Fapped summary
const TYPE_COLORS: { [key: string]: string } = {
  FULL: "#EF4444", // Red
  RUINED: "#A855F7", // Purple
  HANDSFREE: "#06B6D4", // Cyan
  ANAL: "#22C55E", // Green
};

const ITEMS_PER_PAGE = 10;

type FeedEvent =
  | { type: "orgasm"; data: Orgasm }
  | { type: "chastity_start"; data: ChastitySession }
  | { type: "chastity_end"; data: ChastitySession };

interface OrgasmFeedProps {
  orgasms: Orgasm[];
  chastitySessions?: ChastitySession[];
  tz: string;
}

type FeedItem =
  | { type: "orgasm"; data: Orgasm }
  | { type: "chastity_session"; data: ChastitySession; orgasms: Orgasm[] };

export default function OrgasmFeed({
  orgasms,
  chastitySessions = [],
  tz,
}: OrgasmFeedProps) {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

  // Group events by chastity sessions
  const feedItems = useMemo(() => {
    const items: FeedItem[] = [];
    const validOrgasms = orgasms.filter((o) => o.timestamp !== null);

    // Sort sessions by start time (most recent first)
    const sortedSessions = [...chastitySessions].sort((a, b) =>
      dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf()
    );

    // Track which orgasms are in sessions
    const orgasmsInSessions = new Set<string>();

    // Process each session
    sortedSessions.forEach((session) => {
      const sessionStart = dayjs(session.startTime);
      const sessionEnd = session.endTime ? dayjs(session.endTime) : dayjs();

      // Find orgasms within this session (inclusive on both ends)
      const sessionOrgasms = validOrgasms.filter((orgasm) => {
        if (!orgasm.timestamp) return false;
        const orgasmTime = dayjs(orgasm.timestamp);
        return (
          (orgasmTime.isAfter(sessionStart) ||
            orgasmTime.isSame(sessionStart)) &&
          (orgasmTime.isBefore(sessionEnd) || orgasmTime.isSame(sessionEnd))
        );
      });

      // Mark these orgasms as used
      sessionOrgasms.forEach((orgasm) => orgasmsInSessions.add(orgasm.id));

      // Create session item
      items.push({
        type: "chastity_session",
        data: session,
        orgasms: sessionOrgasms.sort(
          (a, b) =>
            dayjs(b.timestamp!).valueOf() - dayjs(a.timestamp!).valueOf()
        ),
      });
    });

    // Add standalone orgasms (not in any session)
    validOrgasms
      .filter((orgasm) => !orgasmsInSessions.has(orgasm.id))
      .forEach((orgasm) => {
        items.push({ type: "orgasm", data: orgasm });
      });

    // Sort items by most recent timestamp (reverse chronological)
    // For sessions, use endTime if available (most recent event), otherwise startTime
    items.sort((a, b) => {
      const aTime =
        a.type === "orgasm"
          ? dayjs(a.data.timestamp)
          : a.data.endTime
            ? dayjs(a.data.endTime)
            : dayjs(a.data.startTime);
      const bTime =
        b.type === "orgasm"
          ? dayjs(b.data.timestamp)
          : b.data.endTime
            ? dayjs(b.data.endTime)
            : dayjs(b.data.startTime);
      return bTime.valueOf() - aTime.valueOf();
    });

    return items;
  }, [orgasms, chastitySessions]);

  if (feedItems.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No events to show.
      </div>
    );
  }

  const displayedItems = feedItems.slice(0, displayCount);
  const hasMore = displayCount < feedItems.length;

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const formatDate = (date: dayjs.Dayjs) => {
    const now = dayjs().tz(tz);
    const isToday = date.isSame(now, "day");
    const isYesterday = date.isSame(now.subtract(1, "day"), "day");

    if (isToday) {
      return `Today at ${date.format("h:mm A")}`;
    } else if (isYesterday) {
      return `Yesterday at ${date.format("h:mm A")}`;
    } else if (now.diff(date, "day") < 7) {
      return date.format("dddd [at] h:mm A");
    } else {
      return date.format("MMM D, YYYY [at] h:mm A");
    }
  };

  const renderOrgasm = (orgasm: Orgasm, noBorder = false) => {
    if (!orgasm.timestamp) return null;

    const date = dayjs(orgasm.timestamp).tz(tz);
    const dateDisplay = formatDate(date);

    return (
      <div
        key={`orgasm-${orgasm.id}`}
        className={`bg-white dark:bg-gray-800 p-4 ${
          noBorder
            ? "border-l-2 border-gray-300 dark:border-gray-600"
            : "rounded-lg border border-gray-200 dark:border-gray-700"
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {dateDisplay}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span
            className="px-2 py-1 rounded-full text-xs font-medium text-white"
            style={{
              backgroundColor: TYPE_COLORS[orgasm.type] || "#999",
            }}
          >
            {orgasm.type.charAt(0) + orgasm.type.slice(1).toLowerCase()}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {orgasm.sex.charAt(0) + orgasm.sex.slice(1).toLowerCase()}
          </span>
        </div>

        {orgasm.note && orgasm.note.trim() && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {orgasm.note.trim()}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {displayedItems.map((item) => {
        if (item.type === "orgasm") {
          return renderOrgasm(item.data);
        } else if (item.type === "chastity_session") {
          const session = item.data;
          const sessionOrgasms = item.orgasms;
          const startDate = dayjs(session.startTime).tz(tz);
          const startDateDisplay = formatDate(startDate);
          const isActive = !session.endTime;

          return (
            <div
              key={`chastity-session-${session.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              {/* Session End (most recent) */}
              {session.endTime && (
                <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(dayjs(session.endTime).tz(tz))}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium text-white bg-orange-500">
                      Chastity Ended
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Lasted{" "}
                      {dayjs
                        .duration(
                          dayjs(session.endTime).diff(dayjs(session.startTime))
                        )
                        .humanize()}
                    </span>
                  </div>

                  {session.note && session.note.trim() && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {session.note.trim()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Orgasms during session (most recent first) */}
              {sessionOrgasms.length > 0 && (
                <div className="flex flex-col gap-3 mb-3">
                  {sessionOrgasms.map((orgasm) => renderOrgasm(orgasm, true))}
                </div>
              )}

              {/* Session Start (oldest) */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {startDateDisplay}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium text-white bg-blue-500">
                    Chastity Started
                  </span>
                  {isActive && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium text-white bg-green-500">
                      Active
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        }
        return null;
      })}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-pink-500 dark:bg-pink-600 text-white rounded-md hover:bg-pink-600 dark:hover:bg-pink-700 transition-colors font-medium"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
