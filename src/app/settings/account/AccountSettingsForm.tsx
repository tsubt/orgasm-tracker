"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { checkUsername, updateSettings } from "./actions";

export default function AccountSettingsForm({
  initialUsername,
  initialPublicProfile,
  initialPublicOrgasms,
  initialTrackChastityStatus,
  initialFirstDayOfWeek,
}: {
  initialUsername: string;
  initialPublicProfile: boolean;
  initialPublicOrgasms: boolean;
  initialTrackChastityStatus: boolean;
  initialFirstDayOfWeek: number;
}) {
  const router = useRouter();
  const [newUsername, setNewUsername] = useState(initialUsername);
  const [newUsernameOK, setNewUsernameOK] = useState<
    "ok" | "taken" | "checking" | "invalid" | "empty"
  >(newUsername === "" ? "empty" : "ok");
  const [newVisibility, setNewVisibility] = useState<"public" | "private">(
    initialPublicProfile ? "public" : "private"
  );
  const [newOVisibility, setNewOVisibility] = useState<"public" | "private">(
    initialPublicOrgasms ? "public" : "private"
  );
  const [trackChastityStatus, setTrackChastityStatus] = useState(
    initialTrackChastityStatus
  );
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(initialFirstDayOfWeek);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Sync state with props when they change - use a ref to track if we've initialized
  const prevInitialUsername = useRef(initialUsername);
  const prevInitialPublicProfile = useRef(initialPublicProfile);
  const prevInitialPublicOrgasms = useRef(initialPublicOrgasms);
  const prevInitialTrackChastityStatus = useRef(initialTrackChastityStatus);
  const prevInitialFirstDayOfWeek = useRef(initialFirstDayOfWeek);

  useEffect(() => {
    if (prevInitialUsername.current !== initialUsername) {
      prevInitialUsername.current = initialUsername;
      startTransition(() => {
        setNewUsername(initialUsername);
      });
    }
    if (prevInitialPublicProfile.current !== initialPublicProfile) {
      prevInitialPublicProfile.current = initialPublicProfile;
      startTransition(() => {
        setNewVisibility(initialPublicProfile ? "public" : "private");
      });
    }
    if (prevInitialPublicOrgasms.current !== initialPublicOrgasms) {
      prevInitialPublicOrgasms.current = initialPublicOrgasms;
      startTransition(() => {
        setNewOVisibility(initialPublicOrgasms ? "public" : "private");
      });
    }
    if (prevInitialTrackChastityStatus.current !== initialTrackChastityStatus) {
      prevInitialTrackChastityStatus.current = initialTrackChastityStatus;
      startTransition(() => {
        setTrackChastityStatus(initialTrackChastityStatus);
      });
    }
    if (prevInitialFirstDayOfWeek.current !== initialFirstDayOfWeek) {
      prevInitialFirstDayOfWeek.current = initialFirstDayOfWeek;
      startTransition(() => {
        setFirstDayOfWeek(initialFirstDayOfWeek);
      });
    }
  }, [
    initialUsername,
    initialPublicProfile,
    initialPublicOrgasms,
    initialTrackChastityStatus,
    initialFirstDayOfWeek,
    startTransition,
  ]);

  // Check for active session when trackChastityStatus changes
  useEffect(() => {
    if (!trackChastityStatus) {
      startTransition(() => {
        setHasActiveSession(false);
      });
      return;
    }

    let cancelled = false;

    fetch("/api/chastity")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.sessions) {
          const active = data.sessions.find(
            (s: { endTime: Date | null }) => !s.endTime
          );
          startTransition(() => {
            if (!cancelled) {
              setHasActiveSession(!!active);
            }
          });
        }
      })
      .catch(() => {
        // Ignore errors
      });

    return () => {
      cancelled = true;
    };
  }, [trackChastityStatus, startTransition]);

  useEffect(() => {
    let cancelled = false;

    if (newUsername === "") {
      startTransition(() => {
        if (!cancelled) {
          setNewUsernameOK("empty");
        }
      });
      return;
    }
    if (newUsername === initialUsername) {
      startTransition(() => {
        if (!cancelled) {
          setNewUsernameOK("ok");
        }
      });
      return;
    }
    if (newUsername.length < 3) {
      startTransition(() => {
        if (!cancelled) {
          setNewUsernameOK("invalid");
        }
      });
      return;
    }
    // Check if username contains only alphanumeric characters, underscores, and dots
    if (!/^[a-zA-Z0-9_.]+$/.test(newUsername)) {
      startTransition(() => {
        if (!cancelled) {
          setNewUsernameOK("invalid");
        }
      });
      return;
    }

    startTransition(() => {
      if (!cancelled) {
        setNewUsernameOK("checking");
      }
    });
    checkUsername(newUsername).then((available) => {
      if (!cancelled) {
        startTransition(() => {
          if (!cancelled) {
            setNewUsernameOK(available ? "ok" : "taken");
          }
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [newUsername, initialUsername, startTransition]);

  const handleSave = async () => {
    if (newUsernameOK !== "ok" && newUsernameOK !== "empty") return;

    startTransition(async () => {
      try {
        const toastId = toast.loading("Saving settings...");
        await updateSettings({
          username: newUsername,
          publicProfile: newVisibility === "public",
          publicOrgasms: newOVisibility === "public",
          trackChastityStatus,
          firstDayOfWeek,
        });
        toast.success("Settings saved!", { id: toastId });
        router.refresh();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save settings";
        toast.error(errorMessage);
        console.error(error);
      }
    });
  };

  const canShowOrgasmSettings =
    newUsernameOK === "ok" && newVisibility === "public";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-col gap-8">
        {/* Username Section */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Username
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => {
                  // Only allow alphanumeric characters, underscores, and dots
                  const value = e.target.value.replace(/[^a-zA-Z0-9_.]/g, "");
                  setNewUsername(value);
                }}
                placeholder="No username set"
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 px-3 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400"
              />
              {newUsernameOK === "ok" ? (
                <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 md:flex-shrink-0">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Available
                </div>
              ) : newUsernameOK === "taken" ? (
                <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 md:flex-shrink-0">
                  <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                  Taken
                </div>
              ) : newUsernameOK === "checking" ? (
                <div className="flex items-center gap-2 text-xs md:flex-shrink-0">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-pink-500 dark:border-pink-400 border-t-transparent"></div>
                </div>
              ) : newUsernameOK === "invalid" ? (
                <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 md:flex-shrink-0">
                  <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                  {newUsername.length < 3
                    ? "Must be at least 3 characters"
                    : "Only letters and numbers allowed"}
                </div>
              ) : null}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Username must be at least 3 characters and contain only letters,
              numbers, underscores, and dots (no spaces, emojis, or other
              special characters). If your username is blank, your profile will
              not be visible to anyone.
            </p>
          </div>
        </div>

        {/* Profile Visibility Section */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Profile visibility
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  id="public"
                  checked={newVisibility === "public"}
                  onChange={() => setNewVisibility("public")}
                  disabled={newUsernameOK !== "ok"}
                  className="h-4 w-4 text-pink-600 dark:text-pink-400 border-gray-300 dark:border-gray-600 focus:ring-pink-500 dark:focus:ring-pink-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-gray-900 dark:text-white">Public</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  id="private"
                  checked={newVisibility === "private"}
                  onChange={() => setNewVisibility("private")}
                  disabled={newUsernameOK !== "ok"}
                  className="h-4 w-4 text-pink-600 dark:text-pink-400 border-gray-300 dark:border-gray-600 focus:ring-pink-500 dark:focus:ring-pink-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-gray-900 dark:text-white">Private</span>
              </label>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Once you have chosen a username, you can make your profile public.
              This will allow you to share your orgasm history with others!
            </p>
            {newUsernameOK === "ok" &&
              newVisibility === "public" &&
              newUsername && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Profile is available at:{" "}
                  <Link
                    href={`/u/${newUsername}`}
                    className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 underline"
                  >
                    {`/u/${newUsername}`}
                  </Link>
                </p>
              )}
          </div>
        </div>

        {/* Public Orgasm Feed Section */}
        {canShowOrgasmSettings && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Public orgasm feed
            </h3>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="orgasmsVisible"
                  id="publicOs"
                  checked={newOVisibility === "public"}
                  onChange={() => setNewOVisibility("public")}
                  className="h-4 w-4 text-pink-600 dark:text-pink-400 border-gray-300 dark:border-gray-600 focus:ring-pink-500 dark:focus:ring-pink-400"
                />
                <span className="text-gray-900 dark:text-white">
                  Include my orgasms
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="orgasmsVisible"
                  id="privateOs"
                  checked={newOVisibility === "private"}
                  onChange={() => setNewOVisibility("private")}
                  className="h-4 w-4 text-pink-600 dark:text-pink-400 border-gray-300 dark:border-gray-600 focus:ring-pink-500 dark:focus:ring-pink-400"
                />
                <span className="text-gray-900 dark:text-white">
                  Exclude my orgasms
                </span>
              </label>
            </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                When your profile is public, you can also choose to publish your
                orgasms on the public feed.
              </p>
            </div>
          </div>
        )}

        {/* First Day of Week Section */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Calendar Settings
          </h3>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="firstDayOfWeek"
              className="text-sm font-medium text-gray-900 dark:text-white"
            >
              First day of week
            </label>
            <select
              id="firstDayOfWeek"
              value={firstDayOfWeek}
              onChange={(e) => setFirstDayOfWeek(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400"
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
            </select>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose which day the calendar view should start on.
            </p>
          </div>
        </div>

        {/* Chastity Tracking Section */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Chastity tracking
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="trackChastityStatus"
                checked={trackChastityStatus}
                onChange={(e) => {
                  if (!e.target.checked && hasActiveSession) {
                    // Prevent unchecking if there's an active session
                    return;
                  }
                  setTrackChastityStatus(e.target.checked);
                }}
                disabled={!trackChastityStatus && hasActiveSession}
                className="mt-1 h-4 w-4 text-pink-600 dark:text-pink-400 border-gray-300 dark:border-gray-600 rounded focus:ring-pink-500 dark:focus:ring-pink-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <label
                  htmlFor="trackChastityStatus"
                  className={`text-gray-900 dark:text-white cursor-pointer ${
                    !trackChastityStatus && hasActiveSession
                      ? "cursor-not-allowed opacity-50"
                      : ""
                  }`}
                >
                  Track chastity status
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Enable tracking of chastity sessions with start and end times.
                  This is currently in development, so please let me know if you
                  have suggestions or feedback.
                </p>
                {!trackChastityStatus && hasActiveSession && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    You have an active session. Please end it before disabling
                    chastity tracking.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          {isPending ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-pink-500 dark:border-pink-400 border-t-transparent"></div>
          ) : (
            <button
              onClick={handleSave}
              disabled={newUsernameOK !== "ok" && newUsernameOK !== "empty"}
              className="px-4 py-2 bg-pink-500 dark:bg-pink-600 text-white rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-600 dark:hover:bg-pink-700 transition-colors"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
