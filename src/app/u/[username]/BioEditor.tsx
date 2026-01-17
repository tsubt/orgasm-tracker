"use client";

import { useState, useTransition, useImperativeHandle, forwardRef } from "react";
import { updateBio } from "./actions";
import { PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface BioEditorProps {
  initialBio: string | null;
  isOwnProfile: boolean;
}

export interface BioEditorRef {
  triggerEdit: () => void;
}

const BioEditor = forwardRef<BioEditorRef, BioEditorProps>(
  ({ initialBio, isOwnProfile }, ref) => {
    const [bio, setBio] = useState(initialBio || "");
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, startTransition] = useTransition();

    useImperativeHandle(ref, () => ({
      triggerEdit: () => {
        if (isOwnProfile) {
          setIsEditing(true);
        }
      },
    }));

    if (!isOwnProfile) {
      return (
        <div className="text-gray-600 dark:text-gray-400 text-sm">
          {initialBio || "No bio yet."}
        </div>
      );
    }

    const handleSave = () => {
      startTransition(async () => {
        await updateBio(bio);
        setIsEditing(false);
      });
    };

    const handleCancel = () => {
      setBio(initialBio || "");
      setIsEditing(false);
    };

    if (isEditing) {
      return (
        <div className="flex flex-col gap-2">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            maxLength={160}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {bio.length}/160
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="p-1.5 text-pink-500 hover:text-pink-600 disabled:opacity-50"
              >
                <CheckIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-gray-600 dark:text-gray-400 text-sm">
        {initialBio || "No bio yet."}
      </div>
    );
  }
);

BioEditor.displayName = "BioEditor";

export default BioEditor;
