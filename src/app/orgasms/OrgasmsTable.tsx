"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Orgasm, OrgasmType, SexType } from "@prisma/client";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

dayjs.extend(utc);
dayjs.extend(timezone);

const OrgasmTypes = Object.keys(OrgasmType).map((x) => {
  return {
    value: x as OrgasmType,
    label: x.charAt(0) + x.slice(1).toLowerCase(),
  };
});

const SexTypes = Object.keys(SexType).map((x) => {
  return {
    value: x as SexType,
    label: x.charAt(0) + x.slice(1).toLowerCase(),
  };
});

const ITEMS_PER_PAGE = 20;

type EditOrgasm = Orgasm & {
  _localDate?: string;
  _localTime?: string;
};

type SortKey = "timestamp" | "type" | "sex" | "note";
type SortDir = "asc" | "desc";

const controlClass =
  "w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500";

function localDay(
  timestamp: Date | string | null,
  timeZone: string
): string | null {
  if (!timestamp) return null;
  return dayjs(timestamp).tz(timeZone).format("YYYY-MM-DD");
}

function compareOrgasms(
  a: Orgasm,
  b: Orgasm,
  sortKey: SortKey,
  sortDir: SortDir
): number {
  const direction = sortDir === "asc" ? 1 : -1;
  if (sortKey === "timestamp") {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : null;
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : null;
    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return (aTime - bTime) * direction;
  }
  const aText = (sortKey === "note" ? a.note ?? "" : a[sortKey]).toLowerCase();
  const bText = (sortKey === "note" ? b.note ?? "" : b[sortKey]).toLowerCase();
  return aText.localeCompare(bText) * direction;
}

function filterOrgasms(
  orgasms: Orgasm[],
  query: {
    search: string;
    type: OrgasmType | "";
    sex: SexType | "";
    fromDate: string;
    toDate: string;
    sortKey: SortKey;
    sortDir: SortDir;
    timeZone: string;
  }
): Orgasm[] {
  const search = query.search.trim().toLowerCase();
  const filtered = orgasms.filter((orgasm) => {
    if (query.type && orgasm.type !== query.type) return false;
    if (query.sex && orgasm.sex !== query.sex) return false;
    if (search && !(orgasm.note ?? "").toLowerCase().includes(search)) {
      return false;
    }
    if (query.fromDate || query.toDate) {
      const day = localDay(orgasm.timestamp, query.timeZone);
      if (!day) return false;
      if (query.fromDate && day < query.fromDate) return false;
      if (query.toDate && day > query.toDate) return false;
    }
    return true;
  });
  return [...filtered].sort((a, b) =>
    compareOrgasms(a, b, query.sortKey, query.sortDir)
  );
}

export default function OrgasmsTable() {
  const [orgasms, setOrgasms] = useState<Orgasm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editOrgasm, setEditOrgasm] = useState<EditOrgasm | null>(null);
  const [deleteOrgasmConfirm, setDeleteOrgasmConfirm] = useState<Orgasm | null>(
    null
  );
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<OrgasmType | "">("");
  const [sexFilter, setSexFilter] = useState<SexType | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const router = useRouter();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    fetchOrgasms();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, sexFilter, fromDate, toDate, sortKey, sortDir]);

  const fetchOrgasms = async () => {
    try {
      const response = await fetch("/api/orgasms");
      if (response.ok) {
        const data = await response.json();
        setOrgasms(data.orgasms || []);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Error fetching orgasms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editOrgasm) return;

    // Hide modal immediately
    const orgasmToEdit = { ...editOrgasm };
    setEditOrgasm(null);
    setEditErrorMessage(null);

    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Convert local date/time to UTC timestamp
    // The date/time in editOrgasm is stored as _localDate and _localTime
    const localDate =
      orgasmToEdit._localDate ||
      (orgasmToEdit.timestamp
        ? dayjs(orgasmToEdit.timestamp)
            .tz(Intl.DateTimeFormat().resolvedOptions().timeZone)
            .format("YYYY-MM-DD")
        : "");
    const localTime =
      orgasmToEdit._localTime ||
      (orgasmToEdit.timestamp
        ? dayjs(orgasmToEdit.timestamp)
            .tz(Intl.DateTimeFormat().resolvedOptions().timeZone)
            .format("HH:mm")
        : "");
    const dateTimeString = `${localDate} ${localTime}`;

    // Parse the string as if it's in the user's timezone, then convert to UTC timestamp
    const localDateTime = dayjs.tz(
      dateTimeString,
      "YYYY-MM-DD HH:mm",
      userTimezone
    );
    const timestamp = localDateTime.utc().toDate();

    // Show loading toast with ID
    const toastId = toast.loading("Updating orgasm...", { id: "edit-orgasm" });

    try {
      const response = await fetch("/api/orgasms", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: orgasmToEdit.id,
          timestamp: timestamp.toISOString(),
          type: orgasmToEdit.type,
          sex: orgasmToEdit.sex,
          note: orgasmToEdit.note,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update orgasm");
      }

      // Show success toast
      toast.success("Successfully updated orgasm!", { id: toastId });

      // Refresh data
      fetchOrgasms();
      router.refresh();
    } catch (error) {
      console.error("Error updating orgasm:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to update. Please try again.";

      // Show error toast
      toast.error(errorMsg, { id: toastId });

      // Reopen modal with error message
      setEditErrorMessage(errorMsg);
      setEditOrgasm(orgasmToEdit);
    }
  };

  const handleDelete = async () => {
    if (!deleteOrgasmConfirm) return;

    // Hide modal immediately
    const orgasmToDelete = deleteOrgasmConfirm;
    setDeleteOrgasmConfirm(null);
    setDeleteErrorMessage(null);

    // Show loading toast with ID
    const toastId = toast.loading("Deleting orgasm...", {
      id: "delete-orgasm",
    });

    try {
      const response = await fetch(`/api/orgasms?id=${orgasmToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete orgasm");
      }

      // Show success toast
      toast.success("Successfully deleted orgasm!", { id: toastId });

      // Refresh data
      fetchOrgasms();
      router.refresh();
    } catch (error) {
      console.error("Error deleting orgasm:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to delete. Please try again.";

      // Show error toast
      toast.error(errorMsg, { id: toastId });

      // Reopen modal with error message
      setDeleteErrorMessage(errorMsg);
      setDeleteOrgasmConfirm(orgasmToDelete);
    }
  };

  const filteredOrgasms = useMemo(
    () =>
      filterOrgasms(orgasms, {
        search,
        type: typeFilter,
        sex: sexFilter,
        fromDate,
        toDate,
        sortKey,
        sortDir,
        timeZone,
      }),
    [
      orgasms,
      search,
      typeFilter,
      sexFilter,
      fromDate,
      toDate,
      sortKey,
      sortDir,
      timeZone,
    ]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-8 w-full">
        <p className="text-lg text-gray-900 dark:text-white">
          Loading orgasms...
        </p>
      </div>
    );
  }

  if (orgasms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-8 w-full">
        <p className="text-lg text-gray-900 dark:text-white">
          No orgasms to show (yet).
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(filteredOrgasms.length / ITEMS_PER_PAGE);
  const page = Math.min(currentPage, Math.max(totalPages, 1));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedOrgasms = filteredOrgasms.slice(startIndex, endIndex);

  const toggleSort = (column: SortKey) => {
    if (sortKey === column) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(column);
    setSortDir(column === "timestamp" ? "desc" : "asc");
  };

  const sortHeader = (column: SortKey, label: string) => {
    const active = sortKey === column;
    return (
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="inline-flex items-center gap-1 text-left text-sm font-semibold text-white cursor-pointer"
      >
        {label}
        {active && (
          <span aria-hidden>{sortDir === "asc" ? "↑" : "↓"}</span>
        )}
      </button>
    );
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 border-b border-gray-200 dark:border-gray-600 px-4 py-3 bg-gray-50 dark:bg-gray-700">
          <label className="flex flex-col gap-1 text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
            Search notes
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes"
              className={controlClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
            Type
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as OrgasmType | "")}
              className={controlClass}
            >
              <option value="">Any</option>
              {OrgasmTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
            Partner
            <select
              value={sexFilter}
              onChange={(e) => setSexFilter(e.target.value as SexType | "")}
              className={controlClass}
            >
              <option value="">Any</option>
              {SexTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
            From
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={`${controlClass} dark:[color-scheme:dark]`}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
            To
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={`${controlClass} dark:[color-scheme:dark]`}
            />
          </label>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full">
            <thead>
              <tr className="bg-pink-500 dark:bg-pink-600">
                <th
                  className="px-4 py-3 text-left"
                  aria-sort={
                    sortKey === "timestamp"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  {sortHeader("timestamp", "Time")}
                </th>
                <th
                  className="px-4 py-3 text-left"
                  aria-sort={
                    sortKey === "type"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  {sortHeader("type", "Type")}
                </th>
                <th
                  className="px-4 py-3 text-left"
                  aria-sort={
                    sortKey === "sex"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  {sortHeader("sex", "Partner?")}
                </th>
                <th
                  className="px-4 py-3 text-left"
                  aria-sort={
                    sortKey === "note"
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  {sortHeader("note", "Note")}
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrgasms.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-gray-700 dark:text-gray-300"
                  >
                    No orgasms match.
                  </td>
                </tr>
              )}
              {paginatedOrgasms.map((orgasm, index) => {
                const actualIndex = startIndex + index;
                return (
                  <tr
                    key={orgasm.id}
                    className={`${
                      actualIndex % 2 === 0
                        ? "bg-white dark:bg-gray-800"
                        : "bg-gray-50 dark:bg-gray-700"
                    } border-t border-gray-200 dark:border-gray-600`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {orgasm.timestamp
                        ? (() => {
                            const userTimezone =
                              Intl.DateTimeFormat().resolvedOptions().timeZone;
                            const localDateTime = dayjs(orgasm.timestamp).tz(
                              userTimezone
                            );
                            return (
                              <>
                                <span className="font-medium">
                                  {localDateTime.format("h:mm A")}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 ml-2">
                                  {localDateTime.format("DD MMM YYYY")}
                                </span>
                              </>
                            );
                          })()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 capitalize">
                      {orgasm.type.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 capitalize">
                      {orgasm.sex.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {orgasm.note || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-row items-center justify-center gap-3">
                        <button
                          onClick={() => {
                            if (!orgasm.timestamp) return;
                            // Convert UTC timestamp to local for editing
                            const userTimezone =
                              Intl.DateTimeFormat().resolvedOptions().timeZone;
                            // Parse the UTC timestamp and convert to user's local timezone
                            const utcDateTime = dayjs(orgasm.timestamp).utc();
                            const localDateTime = utcDateTime.tz(userTimezone);
                            // Store local date/time strings for the form, but keep the original timestamp
                            setEditOrgasm({
                              ...orgasm,
                              // Store local date/time as temporary fields for the form
                              _localDate: localDateTime.format("YYYY-MM-DD"),
                              _localTime: localDateTime.format("HH:mm"),
                            } as EditOrgasm);
                          }}
                          className="text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setDeleteOrgasmConfirm(orgasm)}
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
                {Math.min(endIndex, filteredOrgasms.length)} of{" "}
                {filteredOrgasms.length} orgasms
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNumber) => {
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= page - 1 && pageNumber <= page + 1)
                      ) {
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => handlePageChange(pageNumber)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                              page === pageNumber
                                ? "bg-pink-500 dark:bg-pink-600 text-white"
                                : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      } else if (
                        pageNumber === page - 2 ||
                        pageNumber === page + 2
                      ) {
                        return (
                          <span
                            key={pageNumber}
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
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editOrgasm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 flex h-screen w-screen items-center justify-center bg-black bg-opacity-40 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setEditOrgasm(null);
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
              <h4 className="text-lg font-semibold text-black">Edit orgasm</h4>

              <form onSubmit={handleEdit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="editDate"
                      className="text-sm font-bold uppercase"
                    >
                      Date
                    </label>
                    <input
                      type="date"
                      id="editDate"
                      value={
                        editOrgasm._localDate ||
                        (editOrgasm.timestamp
                          ? dayjs(editOrgasm.timestamp)
                              .tz(
                                Intl.DateTimeFormat().resolvedOptions().timeZone
                              )
                              .format("YYYY-MM-DD")
                          : "")
                      }
                      onChange={(e) =>
                        setEditOrgasm((prev) =>
                          prev ? { ...prev, _localDate: e.target.value } : null
                        )
                      }
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="editTime"
                      className="text-sm font-bold uppercase"
                    >
                      Time
                    </label>
                    <input
                      type="time"
                      id="editTime"
                      value={
                        editOrgasm._localTime ||
                        (editOrgasm.timestamp
                          ? dayjs(editOrgasm.timestamp)
                              .tz(
                                Intl.DateTimeFormat().resolvedOptions().timeZone
                              )
                              .format("HH:mm")
                          : "")
                      }
                      onChange={(e) =>
                        setEditOrgasm((prev) =>
                          prev ? { ...prev, _localTime: e.target.value } : null
                        )
                      }
                      className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="editOrgasmType"
                      className="text-sm font-bold uppercase"
                    >
                      Orgasm Type
                    </label>
                    <select
                      name="editOrgasmType"
                      id="editOrgasmType"
                      className="border border-gray-300 bg-white p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                      value={editOrgasm.type}
                      onChange={(e) =>
                        setEditOrgasm((prev) =>
                          prev
                            ? { ...prev, type: e.target.value as OrgasmType }
                            : null
                        )
                      }
                    >
                      {OrgasmTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="editSexType"
                      className="text-sm font-bold uppercase"
                    >
                      Partner?
                    </label>
                    <select
                      name="editSexType"
                      id="editSexType"
                      className="border border-gray-300 bg-white p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                      value={editOrgasm.sex}
                      onChange={(e) =>
                        setEditOrgasm((prev) =>
                          prev
                            ? { ...prev, sex: e.target.value as SexType }
                            : null
                        )
                      }
                    >
                      {SexTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
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
                    value={editOrgasm.note || ""}
                    onChange={(e) =>
                      setEditOrgasm((prev) =>
                        prev ? { ...prev, note: e.target.value } : null
                      )
                    }
                    className="border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                    rows={4}
                  />
                </div>

                {/* Error message */}
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
                      setEditOrgasm(null);
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
        {deleteOrgasmConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 flex h-screen w-screen items-center justify-center bg-black bg-opacity-40 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setDeleteOrgasmConfirm(null);
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
                Confirm orgasm deletion
              </h4>

              <div className="flex flex-col items-center justify-center gap-4">
                <p className="text-center">
                  You are about to permanently delete this orgasm. This cannot
                  be undone.
                </p>
                <div className="w-full bg-gray-50 rounded p-4 space-y-2">
                  <p className="text-sm">
                    <strong>Date:</strong>{" "}
                    {dayjs(`${deleteOrgasmConfirm.timestamp}`).format(
                      "HH:mm DD MMM YYYY"
                    )}
                  </p>
                  {deleteOrgasmConfirm.note && (
                    <p className="text-sm italic text-gray-600">
                      {deleteOrgasmConfirm.note}
                    </p>
                  )}
                </div>
              </div>

              {/* Error message */}
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
                    setDeleteOrgasmConfirm(null);
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
                  Yes, delete my orgasm!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
