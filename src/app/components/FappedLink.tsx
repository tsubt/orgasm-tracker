"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

function fappedSnapshot(): string | null {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month === 11) return `${year}|/fapped/${year}`;
  if (month === 0) return `${year - 1}|/fapped/${year - 1}`;
  return null;
}

/**
 * Wrapped recap is only relevant right after the year ends.
 * December links to the year in progress; January links to the year that just finished.
 */
export default function FappedLink() {
  const snapshot = useSyncExternalStore(
    () => () => {},
    fappedSnapshot,
    () => null,
  );
  if (!snapshot) return null;
  const [year, href] = snapshot.split("|");
  const label = `Your ${year} Fapped`;

  return (
    <Link
      href={href}
      className="bg-pink-500 dark:bg-pink-600 text-white px-6 py-3 rounded-md shadow hover:bg-pink-600 dark:hover:bg-pink-700 transition-colors text-sm font-semibold uppercase tracking-wide w-full md:w-auto text-center"
    >
      {label}
    </Link>
  );
}
