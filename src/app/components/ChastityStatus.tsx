"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.extend(relativeTime);

type ChastitySession = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  note: string | null;
};

export default function ChastityStatus({
  trackChastityStatus,
}: {
  trackChastityStatus: boolean;
}) {
  const router = useRouter();
  const [activeSession, setActiveSession] = useState<ChastitySession | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startDateRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const startNoteRef = useRef<HTMLTextAreaElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  const endNoteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (trackChastityStatus) {
      fetchActiveSession();
    } else {
      setIsLoading(false);
    }
  }, [trackChastityStatus]);

  const fetchActiveSession = async () => {
    try {
      const response = await fetch("/api/chastity");
      if (response.ok) {
        const data = await response.json();
        const active = data.sessions?.find((s: ChastitySession) => !s.endTime);
        setActiveSession(active || null);
      }
    } catch (error) {
      console.error("Error fetching active session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!startDateRef.current || !startTimeRef.current) return;

    const localDate = startDateRef.current.value;
    const localTime = startTimeRef.current.value;
    const note = startNoteRef.current?.value || null;

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localDateTime = dayjs.tz(`${localDate} ${localTime}`, userTimezone);
    const timestamp = localDateTime.utc().toDate();

    setIsStartModalOpen(false);
    setErrorMessage(null);

    const toastId = toast.loading("Starting session...", {
      id: "start-session",
    });

    try {
      const response = await fetch("/api/chastity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: timestamp.toISOString(),
          note,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start session");
      }

      toast.success("Session started!", { id: toastId });
      router.refresh();
      fetchActiveSession();
    } catch (error) {
      console.error("Error starting session:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to start session. Please try again.";

      toast.error(errorMsg, { id: toastId });
      setErrorMessage(errorMsg);
      setIsStartModalOpen(true);
    }
  };

  const handleEndSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeSession || !endDateRef.current || !endTimeRef.current) return;

    const localDate = endDateRef.current.value;
    const localTime = endTimeRef.current.value;
    const note = endNoteRef.current?.value || activeSession.note || null;

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localDateTime = dayjs.tz(`${localDate} ${localTime}`, userTimezone);
    const timestamp = localDateTime.utc().toDate();

    setIsEndModalOpen(false);
    setErrorMessage(null);

    const toastId = toast.loading("Ending session...", { id: "end-session" });

    try {
      const response = await fetch("/api/chastity", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: activeSession.id,
          startTime: activeSession.startTime,
          endTime: timestamp.toISOString(),
          note,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to end session");
      }

      toast.success("Session ended!", { id: toastId });
      router.refresh();
      fetchActiveSession();
    } catch (error) {
      console.error("Error ending session:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to end session. Please try again.";

      toast.error(errorMsg, { id: toastId });
      setErrorMessage(errorMsg);
      setIsEndModalOpen(true);
    }
  };

  if (!trackChastityStatus) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-64"></div>
      </div>
    );
  }

  const today = dayjs.utc().local();
  const defaultDate = today.format("YYYY-MM-DD");
  const defaultTime = today.format("HH:mm");

  return (
    <>
      <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        {activeSession ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                  Chastity status: locked{" "}
                  {dayjs(activeSession.startTime)
                    .utc()
                    .tz(Intl.DateTimeFormat().resolvedOptions().timeZone)
                    .fromNow(true)}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Started{" "}
                  {dayjs(activeSession.startTime)
                    .utc()
                    .tz(Intl.DateTimeFormat().resolvedOptions().timeZone)
                    .format("D MMM YYYY, H:ma")}
                </p>
              </div>
              <button
                onClick={() => {
                  if (activeSession) {
                    if (endDateRef.current)
                      endDateRef.current.value = defaultDate;
                    if (endTimeRef.current)
                      endTimeRef.current.value = defaultTime;
                    if (endNoteRef.current)
                      endNoteRef.current.value = activeSession.note || "";
                    setIsEndModalOpen(true);
                  }
                }}
                className="px-4 py-2 bg-pink-500 dark:bg-pink-600 text-white rounded-md shadow hover:bg-pink-600 dark:hover:bg-pink-700 transition-colors text-sm font-semibold uppercase tracking-wide"
              >
                End session
              </button>
            </div>
            {activeSession.note && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {activeSession.note}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                Chastity status: unlocked
              </h4>
            </div>
            <button
              onClick={() => {
                if (startDateRef.current)
                  startDateRef.current.value = defaultDate;
                if (startTimeRef.current)
                  startTimeRef.current.value = defaultTime;
                if (startNoteRef.current) startNoteRef.current.value = "";
                setIsStartModalOpen(true);
              }}
              className="px-4 py-2 bg-pink-500 dark:bg-pink-600 text-white rounded-md shadow hover:bg-pink-600 dark:hover:bg-pink-700 transition-colors text-sm font-semibold uppercase tracking-wide"
            >
              Start a session
            </button>
          </div>
        )}
      </div>

      {/* Start Session Modal */}
      <AnimatePresence>
        {isStartModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 flex h-screen w-screen items-center justify-center bg-black bg-opacity-40 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsStartModalOpen(false);
                setErrorMessage(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col gap-4 rounded-lg bg-white p-6 text-black shadow-xl max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-lg font-semibold text-black">
                Start a chastity session
              </h4>

              <form
                onSubmit={handleStartSession}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2 lg:grid lg:grid-flow-col lg:grid-rows-2 lg:items-center lg:gap-x-8">
                  <label
                    htmlFor="startDate"
                    className="text-sm font-bold uppercase"
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    ref={startDateRef}
                    defaultValue={defaultDate}
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />

                  <label
                    htmlFor="startTime"
                    className="text-sm font-bold uppercase"
                  >
                    Start Time
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    ref={startTimeRef}
                    defaultValue={defaultTime}
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="startNote"
                    className="text-sm font-bold uppercase"
                  >
                    Notes
                  </label>
                  <textarea
                    name="startNote"
                    id="startNote"
                    ref={startNoteRef}
                    className="border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                    placeholder="Details you'd like to remember"
                    rows={4}
                  />
                </div>

                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
                  >
                    ✗ {errorMessage}
                  </motion.div>
                )}

                <div className="mt-2 flex justify-between border-t pt-4 -mx-6 px-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsStartModalOpen(false);
                      setErrorMessage(null);
                    }}
                    className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-pink-500 dark:bg-pink-600 text-white rounded hover:bg-pink-600 dark:hover:bg-pink-700 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Session Modal */}
      <AnimatePresence>
        {isEndModalOpen && activeSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 flex h-screen w-screen items-center justify-center bg-black bg-opacity-40 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsEndModalOpen(false);
                setErrorMessage(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col gap-4 rounded-lg bg-white p-6 text-black shadow-xl max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-lg font-semibold text-black">
                End chastity session
              </h4>

              <form onSubmit={handleEndSession} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 lg:grid lg:grid-flow-col lg:grid-rows-2 lg:items-center lg:gap-x-8">
                  <label
                    htmlFor="endDate"
                    className="text-sm font-bold uppercase"
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    ref={endDateRef}
                    defaultValue={defaultDate}
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />

                  <label
                    htmlFor="endTime"
                    className="text-sm font-bold uppercase"
                  >
                    End Time
                  </label>
                  <input
                    type="time"
                    id="endTime"
                    ref={endTimeRef}
                    defaultValue={defaultTime}
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="endNote"
                    className="text-sm font-bold uppercase"
                  >
                    Notes
                  </label>
                  <textarea
                    name="endNote"
                    id="endNote"
                    ref={endNoteRef}
                    defaultValue={activeSession.note || ""}
                    className="border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                    placeholder="Details you'd like to remember"
                    rows={4}
                  />
                </div>

                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
                  >
                    ✗ {errorMessage}
                  </motion.div>
                )}

                <div className="mt-2 flex justify-between border-t pt-4 -mx-6 px-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEndModalOpen(false);
                      setErrorMessage(null);
                    }}
                    className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-pink-500 dark:bg-pink-600 text-white rounded hover:bg-pink-600 dark:hover:bg-pink-700 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
