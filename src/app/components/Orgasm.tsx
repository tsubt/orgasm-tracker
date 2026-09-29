"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { OrgasmType, SexType } from "@prisma/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useOrgasmModal } from "../contexts/OrgasmModalContext";

const OrgasmDialog = dynamic(() => import("./OrgasmDialog"), { ssr: false });

dayjs.extend(utc);
dayjs.extend(timezone);

export default function Orgasm({
  hideButton = false,
}: {
  hideButton?: boolean;
}) {
  const { isOpen, openModal, closeModal } = useOrgasmModal();
  const [dialogMounted, setDialogMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<OrgasmType>("FULL");
  const [sex, setSex] = useState<SexType>("SOLO");
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) setDialogMounted(true);
  }, [isOpen]);

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

      {dialogMounted && (
        <OrgasmDialog
          isOpen={isOpen}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
          onClose={handleClose}
          dateRef={dateRef}
          timeRef={timeRef}
          noteRef={noteRef}
          type={type}
          setType={setType}
          sex={sex}
          setSex={setSex}
          defaultDate={defaultDate}
          defaultTime={defaultTime}
        />
      )}
    </>
  );
}
