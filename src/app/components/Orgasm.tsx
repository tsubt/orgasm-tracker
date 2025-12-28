"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { OrgasmType, SexType } from "@prisma/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useOrgasmModal } from "../contexts/OrgasmModalContext";

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

export default function Orgasm({
  hideButton = false,
}: {
  hideButton?: boolean;
}) {
  const { isOpen, openModal, closeModal } = useOrgasmModal();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<OrgasmType>("FULL");
  const [sex, setSex] = useState<SexType>("SOLO");
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const today = dayjs.utc().local();
  const defaultDate = today.format("YYYY-MM-DD");
  const defaultTime = today.format("HH:mm");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const localDate = dateRef.current?.value || defaultDate;
    const localTime = timeRef.current?.value || defaultTime;
    const note = noteRef.current?.value || null;

    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Convert local date/time to UTC timestamp
    const localDateTime = dayjs.tz(`${localDate} ${localTime}`, userTimezone);
    const timestamp = localDateTime.utc().toDate();

    // Hide modal immediately
    closeModal();
    setErrorMessage(null);

    // Show loading toast with ID
    const toastId = toast.loading("Adding orgasm...", { id: "add-orgasm" });

    try {
      const response = await fetch("/api/orgasms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timestamp: timestamp.toISOString(),
          type,
          sex,
          note,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create orgasm");
      }

      // Show success toast
      toast.success("Successfully added orgasm!", { id: toastId });

      // Refresh the page to show updated stats
      router.refresh();

      // Reset form
      if (dateRef.current) dateRef.current.value = defaultDate;
      if (timeRef.current) timeRef.current.value = defaultTime;
      if (noteRef.current) noteRef.current.value = "";
      setType("FULL");
      setSex("SOLO");
    } catch (error) {
      console.error("Error submitting orgasm:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Failed to save. Please try again.";

      // Show error toast
      toast.error(errorMsg, { id: toastId });

      // Reopen modal with error message
      setErrorMessage(errorMsg);
      openModal();
    }
  };

  const handleClose = () => {
    closeModal();
    setErrorMessage(null);
  };

  return (
    <>
      {!hideButton && (
        <button
          className="w-full bg-pink-500 dark:bg-pink-600 text-white px-3 py-2.5 rounded-md shadow hover:bg-pink-600 dark:hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold uppercase tracking-wide"
          onClick={openModal}
        >
          I&apos;ve had an orgasm!
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
              className="flex flex-col gap-4 rounded-lg bg-white p-6 text-black shadow-xl max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-lg font-semibold text-black">
                When did you have this orgasm?
              </h4>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 lg:grid lg:grid-flow-col lg:grid-rows-2 lg:items-center lg:gap-x-8">
                  <label
                    htmlFor="orgasmDate"
                    className="text-sm font-bold uppercase"
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    id="orgasmDate"
                    ref={dateRef}
                    defaultValue={defaultDate}
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />

                  <label
                    htmlFor="orgasmTime"
                    className="text-sm font-bold uppercase"
                  >
                    Time
                  </label>
                  <input
                    type="time"
                    id="orgasmTime"
                    min="00:00:00"
                    max="24:00:00"
                    pattern="[0-9]{2}:[0-9]{2}"
                    ref={timeRef}
                    defaultValue={defaultTime}
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2 lg:grid lg:grid-flow-col lg:grid-rows-2 lg:items-center lg:gap-x-8">
                  <label
                    htmlFor="orgasmType"
                    className="text-sm font-bold uppercase"
                  >
                    Orgasm Type
                  </label>
                  <select
                    name="orgasmType"
                    id="orgasmType"
                    className="border border-gray-300 bg-white p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                    value={type}
                    onChange={(e) => setType(e.target.value as OrgasmType)}
                  >
                    {OrgasmTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  <label
                    htmlFor="sexType"
                    className="text-sm font-bold uppercase"
                  >
                    Sex Partner?
                  </label>
                  <select
                    name="sexType"
                    id="sexType"
                    className="border border-gray-300 bg-white p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                    value={sex}
                    onChange={(e) => setSex(e.target.value as SexType)}
                  >
                    {SexTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="orgasmNote"
                    className="text-sm font-bold uppercase"
                  >
                    Notes
                  </label>
                  <textarea
                    name="orgasmNote"
                    id="orgasmNote"
                    className="border border-gray-300 p-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                    placeholder="Details you'd like to remember"
                    ref={noteRef}
                    rows={4}
                  />
                </div>

                {/* Error message */}
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
