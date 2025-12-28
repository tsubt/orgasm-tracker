"use client";

import { PlusIcon } from "@heroicons/react/24/solid";
import { useOrgasmModal } from "../contexts/OrgasmModalContext";

export default function AddOrgasmButton() {
  const { openModal } = useOrgasmModal();

  return (
    <button
      onClick={openModal}
      className="md:hidden p-2 bg-pink-500 dark:bg-pink-600 text-white hover:bg-pink-600 dark:hover:bg-pink-700 rounded cursor-pointer transition-colors"
      aria-label="Add orgasm"
    >
      <PlusIcon className="h-6 w-6" />
    </button>
  );
}
