"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { Orgasm, OrgasmType, SexType } from "@prisma/client";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

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

export default function OrgasmsTable() {
  const [orgasms, setOrgasms] = useState<Orgasm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editOrgasm, setEditOrgasm] = useState<Orgasm | null>(null);
  const [deleteOrgasmConfirm, setDeleteOrgasmConfirm] = useState<Orgasm | null>(
    null
  );
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
    null
  );
  const router = useRouter();

  useEffect(() => {
    fetchOrgasms();
  }, []);

  const fetchOrgasms = async () => {
    try {
      const response = await fetch("/api/orgasms");
      if (response.ok) {
        const data = await response.json();
        setOrgasms(data.orgasms || []);
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
          date: orgasmToEdit.date,
          time: orgasmToEdit.time,
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 bg-white/10 rounded-lg p-8 w-full">
        <p className="text-lg text-white">Loading orgasms...</p>
      </div>
    );
  }

  if (orgasms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 bg-white/10 rounded-lg p-8 w-full">
        <p className="text-lg text-white">No orgasms to show (yet).</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-pink-800">
                <th className="px-4 py-3 text-left text-sm font-semibold text-pink-100">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-pink-100">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-pink-100">
                  Partner?
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-pink-100">
                  Note
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-pink-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {orgasms.map((orgasm, index) => (
                <tr
                  key={orgasm.id}
                  className={`${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } border-t border-gray-200`}
                >
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {dayjs(`${orgasm.date} ${orgasm.time}`).format(
                      "DD MMM YYYY @ HH:mm"
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                    {orgasm.type.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                    {orgasm.sex.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {orgasm.note || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-row items-center justify-center gap-3">
                      <button
                        onClick={() => setEditOrgasm(orgasm)}
                        className="text-gray-600 hover:text-pink-800 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setDeleteOrgasmConfirm(orgasm)}
                        className="text-gray-600 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                      value={editOrgasm.date}
                      onChange={(e) =>
                        setEditOrgasm((prev) =>
                          prev ? { ...prev, date: e.target.value } : null
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
                      value={editOrgasm.time}
                      onChange={(e) =>
                        setEditOrgasm((prev) =>
                          prev ? { ...prev, time: e.target.value } : null
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
                    className="px-4 py-2 bg-pink-800 text-pink-50 rounded hover:bg-pink-900 flex items-center gap-2 cursor-pointer transition-colors"
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
                    {dayjs(
                      `${deleteOrgasmConfirm.date} ${deleteOrgasmConfirm.time}`
                    ).format("HH:mm DD MMM YYYY")}
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
