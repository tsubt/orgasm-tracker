"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { localPastTimeError, watchFields } from "@/lib/pastTime";

dayjs.extend(utc);
dayjs.extend(timezone);

export default function RecordChastitySession({
  hideButton = false,
}: {
  hideButton?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() =>
    dayjs().format("YYYY-MM-DD")
  );
  const [startTime, setStartTime] = useState(() => dayjs().format("HH:mm"));
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const router = useRouter();

  const noteRef = useRef<HTMLTextAreaElement>(null);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startFieldError = localPastTimeError(
    startDate,
    startTime,
    "Start time",
    timeZone,
  );
  const endFieldError = localPastTimeError(
    endDate,
    endTime,
    "End time",
    timeZone,
  );

  useEffect(() => {
    if (!isOpen) return;
    return watchFields({
      startDate: setStartDate,
      startTime: setStartTime,
      endDate: setEndDate,
      endTime: setEndTime,
    });
  }, [isOpen]);

  const today = dayjs.utc().local();
  const defaultDate = today.format("YYYY-MM-DD");
  const defaultTime = today.format("HH:mm");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const startLocalDate = startDate || defaultDate;
    const startLocalTime = startTime || defaultTime;
    const endLocalDate = endDate;
    const endLocalTime = endTime;
    const note = noteRef.current?.value || null;

    if (
      localPastTimeError(startLocalDate, startLocalTime, "Start time", timeZone) ||
      localPastTimeError(endLocalDate, endLocalTime, "End time", timeZone)
    ) {
      return;
    }

    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Convert local date/time to UTC timestamp
    const startLocalDateTime = dayjs.tz(
      `${startLocalDate} ${startLocalTime}`,
      userTimezone
    );
    const startTimestamp = startLocalDateTime.utc().toDate();

    let endTimestamp: Date | null = null;
    if (endLocalDate && endLocalTime) {
      const endLocalDateTime = dayjs.tz(
        `${endLocalDate} ${endLocalTime}`,
        userTimezone
      );
      endTimestamp = endLocalDateTime.utc().toDate();
    }

    // Hide modal immediately
    setIsOpen(false);
    setErrorMessage(null);

    // Show loading toast with ID
    const toastId = toast.loading("Recording session...", {
      id: "record-chastity",
    });

    try {
      const response = await fetch("/api/chastity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: startTimestamp.toISOString(),
          endTime: endTimestamp ? endTimestamp.toISOString() : null,
          note,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to record session");
      }

      // Show success toast
      toast.success("Successfully recorded session!", { id: toastId });

      // Refresh the page to show updated sessions
      router.refresh();

      // Reset form
      setStartDate(dayjs().format("YYYY-MM-DD"));
      setStartTime(dayjs().format("HH:mm"));
      setEndDate("");
      setEndTime("");
      if (noteRef.current) noteRef.current.value = "";
    } catch (error) {
      console.error("Error recording session:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to save. Please try again.";

      // Show error toast
      toast.error(errorMsg, { id: toastId });

      // Reopen modal with error message
      setErrorMessage(errorMsg);
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setErrorMessage(null);
  };

  return (
    <>
      {!hideButton && (
        <button
          className="px-4 py-2 bg-pink-500 dark:bg-pink-600 text-white rounded-md shadow hover:bg-pink-600 dark:hover:bg-pink-700 transition-colors text-sm font-semibold uppercase tracking-wide"
          onClick={() => setIsOpen(true)}
        >
          Record session
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 flex h-screen w-screen items-center justify-center bg-black bg-opacity-40 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleClose();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col gap-4 rounded-lg bg-white p-6 text-black shadow-xl max-w-2xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-lg font-semibold text-black">
                Record chastity session
              </h4>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="startDate"
                      className="text-sm font-bold uppercase"
                    >
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.currentTarget.value)}
                      onInput={(e) => setStartDate(e.currentTarget.value)}
                      onBlur={(e) => setStartDate(e.currentTarget.value)}
                      className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        startFieldError ? "border-red-500" : "border-gray-300"
                      }`}
                      required
                    />
                    {startFieldError && (
                      <p className="text-sm text-red-600">{startFieldError}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="startTime"
                      className="text-sm font-bold uppercase"
                    >
                      Start Time
                    </label>
                    <input
                      type="time"
                      id="startTime"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        startFieldError ? "border-red-500" : "border-gray-300"
                      }`}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="endDate"
                      className="text-sm font-bold uppercase"
                    >
                      End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.currentTarget.value)}
                      onInput={(e) => setEndDate(e.currentTarget.value)}
                      onBlur={(e) => setEndDate(e.currentTarget.value)}
                      className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        endFieldError ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {endFieldError && (
                      <p className="text-sm text-red-600">{endFieldError}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="endTime"
                      className="text-sm font-bold uppercase"
                    >
                      End Time
                    </label>
                    <input
                      type="time"
                      id="endTime"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={`border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        endFieldError ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="chastityNote"
                    className="text-sm font-bold uppercase"
                  >
                    Notes
                  </label>
                  <textarea
                    name="chastityNote"
                    id="chastityNote"
                    className="border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                    placeholder="Details you'd like to remember"
                    ref={noteRef}
                    rows={4}
                  />
                </div>

                {/* Error message */}
                {(startFieldError || endFieldError || errorMessage) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
                  >
                    ✗ {startFieldError || endFieldError || errorMessage}
                  </motion.div>
                )}

                <div className="mt-2 flex justify-between border-t pt-4 -mx-6 px-6">
                  <button
                    type="button"
                    onClick={handleClose}
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
