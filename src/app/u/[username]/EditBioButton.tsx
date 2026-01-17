"use client";

import { useRef, useEffect } from "react";
import { PencilIcon } from "@heroicons/react/24/outline";

interface EditBioButtonProps {
  initialBio: string | null;
  isOwnProfile: boolean;
}

// This component exposes a global trigger function
let globalEditTrigger: (() => void) | null = null;

export function setGlobalEditTrigger(trigger: (() => void) | null) {
  globalEditTrigger = trigger;
}

export default function EditBioButton({
  initialBio,
  isOwnProfile,
}: EditBioButtonProps) {
  if (!isOwnProfile) return null;

  const handleClick = () => {
    if (globalEditTrigger) {
      globalEditTrigger();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
      title="Edit bio"
    >
      <PencilIcon className="h-4 w-4" />
      Edit bio
    </button>
  );
}
