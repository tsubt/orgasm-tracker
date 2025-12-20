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
    <div className="grid w-full grid-cols-3 gap-8 text-white">
      <h3 className="text-right text-lg font-bold">Username</h3>

      <div className="col-span-2 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="No username set"
            className="rounded-sm bg-pink-200 p-1 px-3 text-pink-900 accent-pink-900 placeholder:italic placeholder:text-red-500"
          />
          {newUsernameOK === "ok" ? (
            <div className="flex items-center gap-2 text-xs text-green-300">
              <CheckCircleIcon className="ml-2 h-6 w-6 text-green-500" />
              Username available!
            </div>
          ) : newUsernameOK === "taken" ? (
            <div className="flex items-center gap-2 text-xs text-red-300">
              <XCircleIcon className="ml-2 h-6 w-6 text-red-300" />
              Username taken
            </div>
          ) : newUsernameOK === "checking" ? (
            <div className="flex items-center gap-2 text-xs text-red-300">
              <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-transparent"></div>
            </div>
          ) : newUsernameOK === "invalid" ? (
            <div className="flex items-center gap-2 text-xs text-red-300">
              <XCircleIcon className="ml-2 h-6 w-6 text-red-300" />
              Username must be at least 3 characters
            </div>
          ) : (
            <></>
          )}
        </div>
        <p className="text-sm">
          If your username is blank, your profile will not be visible to anyone.
        </p>
      </div>

      <h3 className="text-right text-lg font-bold">Profile visibility</h3>

      <div className="col-span-2 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="radio"
            name="visibility"
            id="public"
            checked={newVisibility === "public"}
            onChange={() => setNewVisibility("public")}
            disabled={newUsernameOK !== "ok"}
          />
          <label htmlFor="public">Public</label>
          <input
            type="radio"
            name="visibility"
            id="private"
            checked={newVisibility === "private"}
            onChange={() => setNewVisibility("private")}
            disabled={newUsernameOK !== "ok"}
          />
          <label htmlFor="private">Private</label>
        </div>
        <p className="text-sm">
          Once you have chosen a username, you can make your profile public. This
          will allow you to share your orgasm history with others!
        </p>
        {newUsernameOK === "ok" &&
          newVisibility === "public" &&
          newUsername && (
            <p>
              Profile is available at:
              <Link
                href={`/u/${newUsername}`}
                className="inline px-2 text-blue-200 hover:text-blue-100"
              >
                {`/u/${newUsername}`}
              </Link>
            </p>
          )}
      </div>

      {canShowOrgasmSettings && (
        <>
          <h3 className="text-right text-lg font-bold">Public orgasm feed</h3>
          <div className="col-span-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="orgasmsVisible"
                id="publicOs"
                checked={newOVisibility === "public"}
                onChange={() => setNewOVisibility("public")}
              />
              <label htmlFor="publicOs">Include my orgasms</label>
              <input
                type="radio"
                name="orgasmsVisible"
                id="privateOs"
                checked={newOVisibility === "private"}
                onChange={() => setNewOVisibility("private")}
              />
              <label htmlFor="privateOs">Exclude my orgasms</label>
            </div>
            <p className="text-sm">
              When your profile is public, you can also choose to publish your
              orgasms on the public feed.
            </p>
          </div>
        </>
      )}

      <div className="col-span-3 flex items-center justify-end">
        {isPending ? (
          <div className="flex justify-end">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={newUsernameOK !== "ok" && newUsernameOK !== "empty"}
            className="rounded-lg bg-white p-2 px-4 font-bold text-pink-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-50"
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
}
