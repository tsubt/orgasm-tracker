"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);
dayjs.extend(relativeTime);

const ITEMS_PER_PAGE = 20;

type ChastitySession = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  note: string | null;
};

type EditSession = ChastitySession & {
  _localStartDate?: string;
  _localStartTime?: string;
  _localEndDate?: string;
  _localEndTime?: string;
};

export default function ChastityTable() {
  const [sessions, setSessions] = useState<ChastitySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editSession, setEditSession] = useState<EditSession | null>(null);
  const [deleteSessionConfirm, setDeleteSessionConfirm] =
    useState<ChastitySession | null>(null);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/chastity");
      if (response.ok) {
        const data = await response.json();
        // Sort by startTime descending (most recent first)
        const sorted = (data.sessions || []).sort(
          (a: ChastitySession, b: ChastitySession) => {
            return (
              new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
            );
          }
        );
        setSessions(sorted);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editSession) return;

    const sessionToEdit = { ...editSession };
    setEditSession(null);
    setEditErrorMessage(null);

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Convert local date/time to UTC timestamp
    const startDate =
      sessionToEdit._localStartDate ||
      (sessionToEdit.startTime
        ? dayjs(sessionToEdit.startTime).tz(userTimezone).format("YYYY-MM-DD")
        : "");
    const startTime =
      sessionToEdit._localStartTime ||
      (sessionToEdit.startTime
        ? dayjs(sessionToEdit.startTime).tz(userTimezone).format("HH:mm")
        : "");
    const startDateTime = dayjs.tz(
      `${startDate} ${startTime}`,
      "YYYY-MM-DD HH:mm",
      userTimezone
    );
    const startTimestamp = startDateTime.utc().toDate();

    let endTimestamp: Date | null = null;
    if (sessionToEdit._localEndDate && sessionToEdit._localEndTime) {
      const endDateTime = dayjs.tz(
        `${sessionToEdit._localEndDate} ${sessionToEdit._localEndTime}`,
        "YYYY-MM-DD HH:mm",
        userTimezone
      );
      endTimestamp = endDateTime.utc().toDate();
    }

    const toastId = toast.loading("Updating session...", {
      id: "edit-session",
    });

    try {
      const response = await fetch("/api/chastity", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: sessionToEdit.id,
          startTime: startTimestamp.toISOString(),
          endTime: endTimestamp?.toISOString() || null,
          note: sessionToEdit.note,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update session");
      }

      toast.success("Successfully updated session!", { id: toastId });
      fetchSessions();
      router.refresh();
    } catch (error) {
      console.error("Error updating session:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to update. Please try again.";

      toast.error(errorMsg, { id: toastId });
      setEditErrorMessage(errorMsg);
      setEditSession(sessionToEdit);
    }
  };

  const handleDelete = async () => {
    if (!deleteSessionConfirm) return;

    const sessionToDelete = deleteSessionConfirm;
    setDeleteSessionConfirm(null);
    setDeleteErrorMessage(null);

    const toastId = toast.loading("Deleting session...", {
      id: "delete-session",
    });

    try {
      const response = await fetch(`/api/chastity?id=${sessionToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete session");
      }

      toast.success("Successfully deleted session!", { id: toastId });
      fetchSessions();
      router.refresh();
    } catch (error) {
      console.error("Error deleting session:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to delete. Please try again.";

      toast.error(errorMsg, { id: toastId });
      setDeleteErrorMessage(errorMsg);
      setDeleteSessionConfirm(sessionToDelete);
    }
  };

  const formatDuration = (startTime: Date, endTime: Date | null) => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const start = dayjs(startTime).utc().tz(userTimezone);
    const end = endTime
      ? dayjs(endTime).utc().tz(userTimezone)
      : dayjs().tz(userTimezone);
    const diff = end.diff(start);

    return dayjs.duration(diff).humanize();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-8 w-full">
        <p className="text-lg text-gray-900 dark:text-white">
          Loading sessions...
        </p>
      </div>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSessions = sessions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 p-8 w-full">
            <p className="text-lg text-gray-900 dark:text-white">
              No sessions to show (yet).
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead>
                  <tr className="bg-pink-500 dark:bg-pink-600">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                      Start Time
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                      End Time
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                      Note
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSessions.map((session, index) => {
                    const actualIndex = startIndex + index;
                    const userTimezone =
                      Intl.DateTimeFormat().resolvedOptions().timeZone;
                    const startLocal = dayjs(session.startTime)
                      .utc()
                      .tz(userTimezone);
                    const endLocal = session.endTime
                      ? dayjs(session.endTime).utc().tz(userTimezone)
                      : null;

                    return (
                      <tr
                        key={session.id}
                        className={`${
                          actualIndex % 2 === 0
                            ? "bg-white dark:bg-gray-800"
                            : "bg-gray-50 dark:bg-gray-700"
                        } border-t border-gray-200 dark:border-gray-600`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          <span className="font-medium">
                            {startLocal.format("h:mm A")}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 ml-2">
                            {startLocal.format("DD MMM YYYY")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {endLocal ? (
                            <>
                              <span className="font-medium">
                                {endLocal.format("h:mm A")}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 ml-2">
                                {endLocal.format("DD MMM YYYY")}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 italic">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {formatDuration(session.startTime, session.endTime)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {session.note || "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-row items-center justify-center gap-3">
                            <button
                              onClick={() => {
                                const userTimezone =
                                  Intl.DateTimeFormat().resolvedOptions()
                                    .timeZone;
                                const startLocal = dayjs(session.startTime)
                                  .utc()
                                  .tz(userTimezone);
                                const endLocal = session.endTime
                                  ? dayjs(session.endTime)
                                      .utc()
                                      .tz(userTimezone)
                                  : null;

                                setEditSession({
                                  ...session,
                                  _localStartDate:
                                    startLocal.format("YYYY-MM-DD"),
                                  _localStartTime: startLocal.format("HH:mm"),
                                  _localEndDate: endLocal
                                    ? endLocal.format("YYYY-MM-DD")
                                    : "",
                                  _localEndTime: endLocal
                                    ? endLocal.format("HH:mm")
                                    : "",
                                });
                              }}
                              className="text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <PencilSquareIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setDeleteSessionConfirm(session)}
                              className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 dark:border-gray-600 px-4 py-3 bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, sessions.length)} of {sessions.length}{" "}
                    sessions
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                                  currentPage === page
                                    ? "bg-pink-500 dark:bg-pink-600 text-white"
                                    : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span
                                key={page}
                                className="px-2 text-gray-500 dark:text-gray-400"
                              >
                                ...
                              </span>
                            );
                          }
                          return null;
                        }
                      )}
                    </div>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 flex h-screen w-screen items-center justify-center bg-black bg-opacity-40 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setEditSession(null);
                setEditErrorMessage(null);
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
                Edit chastity session
              </h4>

              <form onSubmit={handleEdit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="editStartDate"
                      className="text-sm font-bold uppercase"
                    >
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="editStartDate"
                      value={
                        editSession._localStartDate ||
                        (editSession.startTime
                          ? dayjs(editSession.startTime)
                              .tz(
                                Intl.DateTimeFormat().resolvedOptions().timeZone
                              )
                              .format("YYYY-MM-DD")
                          : "")
                      }
                      onChange={(e) =>
                        setEditSession((prev) =>
                          prev
                            ? { ...prev, _localStartDate: e.target.value }
                            : null
                        )
                      }
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="editStartTime"
                      className="text-sm font-bold uppercase"
                    >
                      Start Time
                    </label>
                    <input
                      type="time"
                      id="editStartTime"
                      value={
                        editSession._localStartTime ||
                        (editSession.startTime
                          ? dayjs(editSession.startTime)
                              .tz(
                                Intl.DateTimeFormat().resolvedOptions().timeZone
                              )
                              .format("HH:mm")
                          : "")
                      }
                      onChange={(e) =>
                        setEditSession((prev) =>
                          prev
                            ? { ...prev, _localStartTime: e.target.value }
                            : null
                        )
                      }
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="editEndDate"
                      className="text-sm font-bold uppercase"
                    >
                      End Date
                    </label>
                    <input
                      type="date"
                      id="editEndDate"
                      value={editSession._localEndDate || ""}
                      onChange={(e) =>
                        setEditSession((prev) =>
                          prev
                            ? { ...prev, _localEndDate: e.target.value }
                            : null
                        )
                      }
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="editEndTime"
                      className="text-sm font-bold uppercase"
                    >
                      End Time
                    </label>
                    <input
                      type="time"
                      id="editEndTime"
                      value={editSession._localEndTime || ""}
                      onChange={(e) =>
                        setEditSession((prev) =>
                          prev
                            ? { ...prev, _localEndTime: e.target.value }
                            : null
                        )
                      }
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="editNote"
                    className="text-sm font-bold uppercase"
                  >
                    Note
                  </label>
                  <textarea
                    id="editNote"
                    value={editSession.note || ""}
                    onChange={(e) =>
                      setEditSession((prev) =>
                        prev ? { ...prev, note: e.target.value } : null
                      )
                    }
                    className="border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                    rows={4}
                  />
                </div>

                {editErrorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
                  >
                    ✗ {editErrorMessage}
                  </motion.div>
                )}

                <div className="mt-2 flex justify-between border-t pt-4 -mx-6 px-6">
                  <button
                    type="button"
                    onClick={() => {
                      setEditSession(null);
                      setEditErrorMessage(null);
                    }}
                    className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-pink-500 dark:bg-pink-600 text-white rounded hover:bg-pink-600 dark:hover:bg-pink-700 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    Save changes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteSessionConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 flex h-screen w-screen items-center justify-center bg-black bg-opacity-40 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setDeleteSessionConfirm(null);
                setDeleteErrorMessage(null);
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
                Confirm session deletion
              </h4>

              <div className="flex flex-col items-center justify-center gap-4">
                <p className="text-center">
                  You are about to permanently delete this session. This cannot
                  be undone.
                </p>
                <div className="w-full bg-gray-50 rounded p-4 space-y-2">
                  <p className="text-sm">
                    <strong>Start:</strong>{" "}
                    {dayjs(deleteSessionConfirm.startTime)
                      .utc()
                      .tz(Intl.DateTimeFormat().resolvedOptions().timeZone)
                      .format("HH:mm DD MMM YYYY")}
                  </p>
                  {deleteSessionConfirm.endTime && (
                    <p className="text-sm">
                      <strong>End:</strong>{" "}
                      {dayjs(deleteSessionConfirm.endTime)
                        .utc()
                        .tz(Intl.DateTimeFormat().resolvedOptions().timeZone)
                        .format("HH:mm DD MMM YYYY")}
                    </p>
                  )}
                  {deleteSessionConfirm.note && (
                    <p className="text-sm italic text-gray-600">
                      {deleteSessionConfirm.note}
                    </p>
                  )}
                </div>
              </div>

              {deleteErrorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
                >
                  ✗ {deleteErrorMessage}
                </motion.div>
              )}

              <div className="mt-2 flex justify-between border-t pt-4 -mx-6 px-6">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteSessionConfirm(null);
                    setDeleteErrorMessage(null);
                  }}
                  className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  Yes, delete session!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
