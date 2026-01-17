"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Orgasm, ChastitySession } from "@prisma/client";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

interface MonthCalendarProps {
  month: number; // 1-12
  year: number;
  orgasms: Orgasm[];
  chastitySessions?: ChastitySession[];
  firstDayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  selectedMonth?: number; // For mobile dropdown
  onMonthChange?: (month: number) => void; // For mobile dropdown
  monthNames?: string[]; // For mobile dropdown
}

export default function MonthCalendar({
  month,
  year,
  orgasms,
  chastitySessions = [],
  firstDayOfWeek,
  selectedMonth,
  onMonthChange,
  monthNames,
}: MonthCalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [isTouchTooltip, setIsTouchTooltip] = useState<boolean>(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get the first day of the month and the number of days
  // Use user timezone for consistency with locked dates calculation
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const firstDay = dayjs(`${year}-${month.toString().padStart(2, "0")}-01`).tz(
    userTimezone
  );
  const daysInMonth = firstDay.daysInMonth();
  const firstDayOfMonth = firstDay.day(); // 0 = Sunday, 6 = Saturday

  // Calculate the offset based on user's preferred first day of week
  // Adjust startDayOfWeek so that the calendar starts on the user's preferred day
  const startDayOfWeek = (firstDayOfMonth - firstDayOfWeek + 7) % 7;

  // Group orgasms by date for this month
  const orgasmsByDate: { [date: string]: Orgasm[] } = {};
  orgasms.forEach((o) => {
    if (!o.timestamp) return;
    const orgasmDate = dayjs(o.timestamp);
    if (orgasmDate.month() + 1 === month && orgasmDate.year() === year) {
      const dateStr = orgasmDate.format("YYYY-MM-DD");
      if (!orgasmsByDate[dateStr]) {
        orgasmsByDate[dateStr] = [];
      }
      orgasmsByDate[dateStr].push(o);
    }
  });

  // Create a set of locked dates (days within chastity sessions)
  const lockedDates = useMemo(() => {
    const locked = new Set<string>();
    const today = dayjs().tz(userTimezone).startOf("day");

    chastitySessions.forEach((session) => {
      const startTime = dayjs(session.startTime).utc().tz(userTimezone);
      const sessionStart = startTime.startOf("day");

      // For active sessions (no endTime), use today as the end date
      // For ended sessions, use the actual endTime
      const isActive = !session.endTime;
      const endTime = isActive
        ? today // For active sessions, always use today
        : dayjs(session.endTime).utc().tz(userTimezone).startOf("day");

      const sessionEnd = endTime;
      const monthStart = firstDay.startOf("day");
      const monthEnd = firstDay.endOf("month").startOf("day");

      // Skip if session doesn't overlap with this month
      if (sessionEnd.isBefore(monthStart) || sessionStart.isAfter(monthEnd)) {
        return;
      }

      // Determine the range of dates to mark as locked within this month
      // Start from sessionStart or monthStart, whichever is later
      const rangeStart = sessionStart.isAfter(monthStart)
        ? sessionStart
        : monthStart;

      // End at sessionEnd, monthEnd, or today (for active sessions), whichever is earliest
      let rangeEnd = sessionEnd;
      if (rangeEnd.isAfter(monthEnd)) {
        rangeEnd = monthEnd;
      }
      // For active sessions, never go beyond today
      if (isActive && rangeEnd.isAfter(today)) {
        rangeEnd = today;
      }

      // Add all days in the range that fall within this month
      let current = rangeStart;
      while (!current.isAfter(rangeEnd, "day")) {
        if (current.month() + 1 === month && current.year() === year) {
          locked.add(current.format("YYYY-MM-DD"));
        }
        current = current.add(1, "day");
      }
    });

    return locked;
  }, [chastitySessions, month, year, firstDay, userTimezone]);

  // Check if a date is locked
  const isDateLocked = (date: string | null): boolean => {
    if (!date) return false;
    return lockedDates.has(date);
  };

  // Check if an orgasm occurred during a chastity session
  const isOrgasmDuringChastity = (orgasm: Orgasm): boolean => {
    if (!orgasm.timestamp) return false;
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const orgasmTime = dayjs(orgasm.timestamp).utc().tz(userTimezone);

    return chastitySessions.some((session) => {
      const startTime = dayjs(session.startTime).utc().tz(userTimezone);
      const endTime = session.endTime
        ? dayjs(session.endTime).utc().tz(userTimezone)
        : dayjs(); // If no end time, consider it active until now

      // Check if orgasm occurred during this session (inclusive boundaries)
      return (
        (orgasmTime.isAfter(startTime) || orgasmTime.isSame(startTime)) &&
        (orgasmTime.isBefore(endTime) || orgasmTime.isSame(endTime))
      );
    });
  };

  // Days of the week labels - reorder based on firstDayOfWeek
  const allDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayLabels = [
    ...allDayLabels.slice(firstDayOfWeek),
    ...allDayLabels.slice(0, firstDayOfWeek),
  ];

  // Generate calendar cells
  const calendarCells: Array<{ day: number | null; date: string | null }> = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarCells.push({ day: null, date: null });
  }

  // Add cells for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = firstDay.date(day).format("YYYY-MM-DD");
    calendarCells.push({ day, date: dateStr });
  }

  // Fill remaining cells to complete the grid (6 rows x 7 columns = 42 cells)
  const remainingCells = 42 - calendarCells.length;
  for (let i = 0; i < remainingCells; i++) {
    calendarCells.push({ day: null, date: null });
  }

  // Find sessions that start or end on a given date
  const getChastityEventsForDate = (date: string | null) => {
    if (!date) return { starts: [], ends: [] };
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const targetDate = dayjs(date).tz(userTimezone);

    const starts: ChastitySession[] = [];
    const ends: ChastitySession[] = [];

    chastitySessions.forEach((session) => {
      const startTime = dayjs(session.startTime).utc().tz(userTimezone);
      const endTime = session.endTime
        ? dayjs(session.endTime).utc().tz(userTimezone)
        : null;

      // Check if session starts on this date
      if (startTime.isSame(targetDate, "day")) {
        starts.push(session);
      }

      // Check if session ends on this date
      if (endTime && endTime.isSame(targetDate, "day")) {
        ends.push(session);
      }
    });

    return { starts, ends };
  };

  const handleCellHover = (
    date: string | null,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!date) {
      setHoveredDate(null);
      setHoverPosition(null);
      setIsTouchTooltip(false);
      return;
    }

    const hasOrgasms = orgasmsByDate[date] && orgasmsByDate[date].length > 0;
    const chastityEvents = getChastityEventsForDate(date);
    const hasChastityEvents =
      chastityEvents.starts.length > 0 || chastityEvents.ends.length > 0;

    if (hasOrgasms || hasChastityEvents) {
      setHoveredDate(date);
      setHoverPosition({ x: event.clientX, y: event.clientY });
      setIsTouchTooltip(false);
    } else {
      setHoveredDate(null);
      setHoverPosition(null);
      setIsTouchTooltip(false);
    }
  };

  const handleCellClick = (
    date: string | null,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!date) {
      setHoveredDate(null);
      setHoverPosition(null);
      setIsTouchTooltip(false);
      return;
    }

    const hasOrgasms = orgasmsByDate[date] && orgasmsByDate[date].length > 0;
    const chastityEvents = getChastityEventsForDate(date);
    const hasChastityEvents =
      chastityEvents.starts.length > 0 || chastityEvents.ends.length > 0;

    if (hasOrgasms || hasChastityEvents) {
      // Toggle tooltip if clicking the same date, otherwise show new date
      if (hoveredDate === date) {
        setHoveredDate(null);
        setHoverPosition(null);
        setIsTouchTooltip(false);
      } else {
        setHoveredDate(date);
        setHoverPosition({ x: event.clientX, y: event.clientY });
        setIsTouchTooltip(false);
      }
    } else {
      setHoveredDate(null);
      setHoverPosition(null);
      setIsTouchTooltip(false);
    }
  };

  const handleCellTouch = (
    date: string | null,
    event: React.TouchEvent<HTMLDivElement>
  ) => {
    event.preventDefault(); // Prevent mouse events from firing
    if (!date) {
      setHoveredDate(null);
      setHoverPosition(null);
      setIsTouchTooltip(false);
      return;
    }

    const hasOrgasms = orgasmsByDate[date] && orgasmsByDate[date].length > 0;
    const chastityEvents = getChastityEventsForDate(date);
    const hasChastityEvents =
      chastityEvents.starts.length > 0 || chastityEvents.ends.length > 0;

    if (hasOrgasms || hasChastityEvents) {
      // Toggle tooltip if tapping the same date, otherwise show new date
      if (hoveredDate === date) {
        setHoveredDate(null);
        setHoverPosition(null);
        setIsTouchTooltip(false);
      } else {
        const touch = event.touches[0] || event.changedTouches[0];
        if (touch) {
          setHoveredDate(date);
          setHoverPosition({ x: touch.clientX, y: touch.clientY });
          setIsTouchTooltip(true);
        }
      }
    } else {
      setHoveredDate(null);
      setHoverPosition(null);
      setIsTouchTooltip(false);
    }
  };

  // Calculate tooltip position to avoid viewport overflow
  useEffect(() => {
    if (hoverPosition && tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const offset = 10;

      let left = hoverPosition.x + offset;
      let top = hoverPosition.y + offset;

      // Check right edge overflow
      if (left + tooltipRect.width > viewportWidth) {
        left = hoverPosition.x - tooltipRect.width - offset;
      }

      // Check left edge overflow
      if (left < 0) {
        left = offset;
      }

      // Check bottom edge overflow
      if (top + tooltipRect.height > viewportHeight) {
        top = hoverPosition.y - tooltipRect.height - offset;
      }

      // Check top edge overflow
      if (top < 0) {
        top = offset;
      }

      setTooltipStyle({
        left: `${left}px`,
        top: `${top}px`,
      });
    }
  }, [hoverPosition]);

  // Close tooltip when clicking outside (only for mouse events, not touch)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        hoveredDate &&
        !isTouchTooltip &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        // Check if click is on a calendar cell
        const target = event.target as HTMLElement;
        const calendarCell = target.closest("[data-calendar-cell]");
        if (!calendarCell) {
          setHoveredDate(null);
          setHoverPosition(null);
          setIsTouchTooltip(false);
        }
      }
    };

    if (hoveredDate && !isTouchTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [hoveredDate, isTouchTooltip]);

  const handleCellLeave = () => {
    // Only close on mouse leave if it's not a touch tooltip
    if (!isTouchTooltip) {
      setHoveredDate(null);
      setHoverPosition(null);
    }
  };

  const getColorClass = (date: string | null) => {
    if (!date) return "bg-gray-100 dark:bg-gray-800";

    const isLocked = isDateLocked(date);
    const orgasmsOnDate = orgasmsByDate[date] || [];
    const hasOrgasms = orgasmsOnDate.length > 0;

    // Determine event types and their priorities
    // Priority: Orgasm = 3, Locked orgasm = 2, Locked = 1
    let hasLockedOrgasm = false;
    let hasStandardOrgasm = false;

    if (hasOrgasms) {
      // Check if any orgasm occurred during a chastity session
      hasLockedOrgasm = orgasmsOnDate.some((orgasm) =>
        isOrgasmDuringChastity(orgasm)
      );
      // Check if any orgasm occurred outside a chastity session
      hasStandardOrgasm = orgasmsOnDate.some(
        (orgasm) => !isOrgasmDuringChastity(orgasm)
      );
    }

    // Apply priority system: show highest priority event
    // Priority 3: Standard orgasm (pink)
    if (hasStandardOrgasm) {
      const count = orgasmsOnDate.filter(
        (orgasm) => !isOrgasmDuringChastity(orgasm)
      ).length;
      if (count === 1) return "bg-pink-300 dark:bg-pink-900";
      if (count === 2) return "bg-pink-400 dark:bg-pink-800";
      if (count === 3) return "bg-pink-500 dark:bg-pink-700";
      return "bg-pink-600 dark:bg-pink-600";
    }

    // Priority 2: Locked orgasm (blue)
    if (hasLockedOrgasm) {
      const count = orgasmsOnDate.filter((orgasm) =>
        isOrgasmDuringChastity(orgasm)
      ).length;
      if (count === 1) return "bg-blue-300 dark:bg-blue-900";
      if (count === 2) return "bg-blue-400 dark:bg-blue-800";
      if (count === 3) return "bg-blue-500 dark:bg-blue-700";
      return "bg-blue-600 dark:bg-blue-600";
    }

    // Priority 1: Locked (green)
    if (isLocked) {
      return "bg-green-200 dark:bg-green-900";
    }

    // Default: no orgasms, not locked
    return "bg-gray-100 dark:bg-gray-800";
  };

  const monthName = firstDay.format("MMMM");

  // Calculate total orgasms for this month
  const monthTotal = Object.values(orgasmsByDate).reduce(
    (sum, orgasms) => sum + orgasms.length,
    0
  );

  const isMobile = selectedMonth !== undefined && onMonthChange !== undefined;

  return (
    <div className="relative">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
        {/* Month header */}
        <div className="flex items-center justify-center gap-2 mb-2 sm:mb-2">
          {isMobile && monthNames ? (
            <div className="relative inline-flex items-center">
              <select
                value={selectedMonth}
                onChange={(e) => onMonthChange(parseInt(e.target.value))}
                className="appearance-none text-sm font-semibold text-gray-900 dark:text-gray-100 bg-transparent border-none outline-none cursor-pointer pr-5"
              >
                {monthNames.map((name, index) => (
                  <option key={index + 1} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-0 pointer-events-none w-4 h-4 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          ) : (
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {monthName}
            </h3>
          )}
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200">
            {monthTotal}
          </span>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayLabels.map((label) => (
            <div
              key={label}
              className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center py-1"
            >
              {label.charAt(0)}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell, index) => {
            const hasOrgasms =
              cell.date &&
              orgasmsByDate[cell.date] &&
              orgasmsByDate[cell.date].length > 0;
            const chastityEvents = getChastityEventsForDate(cell.date);
            const hasChastityEvents =
              chastityEvents.starts.length > 0 ||
              chastityEvents.ends.length > 0;
            const hasEvents = hasOrgasms || hasChastityEvents;
            const isToday =
              cell.date && dayjs(cell.date).isSame(dayjs(), "day");

            return (
              <div
                key={index}
                data-calendar-cell
                className={`
                  aspect-square flex items-center justify-center text-xs
                  ${cell.day === null ? "opacity-0" : "cursor-pointer"}
                  ${getColorClass(cell.date)}
                  ${isToday ? "ring-1 ring-pink-400 dark:ring-pink-500" : ""}
                  ${hasEvents ? "hover:opacity-80 transition-opacity" : ""}
                  rounded
                `}
                onMouseEnter={(e) => handleCellHover(cell.date, e)}
                onMouseLeave={handleCellLeave}
                onClick={(e) => handleCellClick(cell.date, e)}
                onTouchStart={(e) => handleCellTouch(cell.date, e)}
              >
                {cell.day !== null && (
                  <span
                    className={`${
                      hasOrgasms
                        ? "text-gray-900 dark:text-gray-100 font-medium"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {cell.day}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredDate && hoverPosition && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-3 shadow-lg pointer-events-none min-w-[200px] max-w-[300px]"
          style={tooltipStyle}
        >
          <div className="text-gray-900 dark:text-gray-100 space-y-2">
            <div className="font-semibold text-sm">
              {dayjs(hoveredDate).format("MMMM D, YYYY")}
            </div>

            {(() => {
              const userTimezone =
                Intl.DateTimeFormat().resolvedOptions().timeZone;
              const chastityEvents = getChastityEventsForDate(hoveredDate);
              const orgasmsOnDate = orgasmsByDate[hoveredDate] || [];

              // Combine all events into a single timeline
              type TimelineEvent =
                | { type: "orgasm"; data: Orgasm; timestamp: Date }
                | {
                    type: "chastity_start";
                    data: ChastitySession;
                    timestamp: Date;
                  }
                | {
                    type: "chastity_end";
                    data: ChastitySession;
                    timestamp: Date;
                  };

              const timelineEvents: TimelineEvent[] = [];

              // Add orgasms
              orgasmsOnDate.forEach((orgasm) => {
                if (orgasm.timestamp) {
                  timelineEvents.push({
                    type: "orgasm",
                    data: orgasm,
                    timestamp: orgasm.timestamp,
                  });
                }
              });

              // Add chastity session starts
              chastityEvents.starts.forEach((session) => {
                timelineEvents.push({
                  type: "chastity_start",
                  data: session,
                  timestamp: session.startTime,
                });
              });

              // Add chastity session ends
              chastityEvents.ends.forEach((session) => {
                if (session.endTime) {
                  timelineEvents.push({
                    type: "chastity_end",
                    data: session,
                    timestamp: session.endTime,
                  });
                }
              });

              // Sort by timestamp
              timelineEvents.sort(
                (a, b) =>
                  new Date(a.timestamp).getTime() -
                  new Date(b.timestamp).getTime()
              );

              const totalOrgasms = orgasmsOnDate.length;

              return (
                <>
                  {/* Event count */}
                  {totalOrgasms > 0 && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {totalOrgasms} {totalOrgasms === 1 ? "orgasm" : "orgasms"}
                    </div>
                  )}

                  {/* Unified timeline */}
                  {timelineEvents.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                      {timelineEvents.map((event) => {
                        const eventTime = dayjs(event.timestamp)
                          .utc()
                          .tz(userTimezone);

                        if (event.type === "orgasm") {
                          const orgasm = event.data;
                          return (
                            <div key={orgasm.id} className="text-xs">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {eventTime.format("h:mm A")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      orgasm.type === "FULL"
                                        ? "bg-pink-500"
                                        : orgasm.type === "RUINED"
                                        ? "bg-purple-500"
                                        : orgasm.type === "HANDSFREE"
                                        ? "bg-blue-500"
                                        : "bg-indigo-500"
                                    }`}
                                  />
                                  <span className="text-gray-600 dark:text-gray-400 capitalize">
                                    {orgasm.type.toLowerCase()}
                                  </span>
                                </div>
                                <div className="text-gray-600 dark:text-gray-400 capitalize">
                                  {orgasm.sex.toLowerCase()}
                                </div>
                              </div>
                              {orgasm.note && (
                                <div className="text-gray-500 dark:text-gray-400 italic mt-0.5">
                                  {orgasm.note}
                                </div>
                              )}
                            </div>
                          );
                        } else if (event.type === "chastity_start") {
                          const session = event.data;
                          return (
                            <div
                              key={`start-${session.id}`}
                              className="text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {eventTime.format("h:mm A")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-green-500" />
                                  <span className="font-medium text-gray-600 dark:text-gray-400">
                                    Locked up
                                  </span>
                                </div>
                              </div>
                              {session.note && (
                                <div className="text-gray-500 dark:text-gray-400 italic mt-0.5">
                                  {session.note}
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          // chastity_end
                          const session = event.data;
                          return (
                            <div key={`end-${session.id}`} className="text-xs">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {eventTime.format("h:mm A")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                  <span className="font-medium text-gray-600 dark:text-gray-400">
                                    Unlocked
                                  </span>
                                </div>
                              </div>
                              {session.note && (
                                <div className="text-gray-500 dark:text-gray-400 italic mt-0.5">
                                  {session.note}
                                </div>
                              )}
                            </div>
                          );
                        }
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
