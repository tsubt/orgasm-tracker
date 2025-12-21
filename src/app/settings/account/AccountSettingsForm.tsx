"use client";

import { useState, useEffect, useTransition } from "react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { checkUsername, updateSettings } from "./actions";

export default function AccountSettingsForm({
  initialUsername,
  initialPublicProfile,
  initialPublicOrgasms,
}: {
  initialUsername: string;
  initialPublicProfile: boolean;
  initialPublicOrgasms: boolean;
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
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setNewUsername(initialUsername);
    setNewVisibility(initialPublicProfile ? "public" : "private");
    setNewOVisibility(initialPublicOrgasms ? "public" : "private");
  }, [initialUsername, initialPublicProfile, initialPublicOrgasms]);

  useEffect(() => {
    let cancelled = false;

    if (newUsername === "") {
      setNewUsernameOK("empty");
      return;
    }
    if (newUsername === initialUsername) {
      setNewUsernameOK("ok");
      return;
    }
    if (newUsername.length < 3) {
      setNewUsernameOK("invalid");
      return;
    }

    setNewUsernameOK("checking");
    checkUsername(newUsername).then((available) => {
      if (!cancelled) {
        setNewUsernameOK(available ? "ok" : "taken");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [newUsername, initialUsername]);

  const handleSave = async () => {
    if (newUsernameOK !== "ok" && newUsernameOK !== "empty") return;

    startTransition(async () => {
      try {
        const toastId = toast.loading("Saving settings...");
        await updateSettings({
          username: newUsername,
          publicProfile: newVisibility === "public",
          publicOrgasms: newOVisibility === "public",
        });
        toast.success("Settings saved!", { id: toastId });
        router.refresh();
      } catch (error) {
        toast.error("Failed to save settings");
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
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="No username set"
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 px-3 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400"
              />
              {newUsernameOK === "ok" ? (
                <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  Available
                </div>
              ) : newUsernameOK === "taken" ? (
                <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
                  <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                  Taken
                </div>
              ) : newUsernameOK === "checking" ? (
                <div className="flex items-center gap-2 text-xs">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-pink-500 dark:border-pink-400 border-t-transparent"></div>
                </div>
              ) : newUsernameOK === "invalid" ? (
                <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
                  <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                  Must be at least 3 characters
                </div>
              ) : null}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              If your username is blank, your profile will not be visible to
              anyone.
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
              <div className="flex items-center gap-4">
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
