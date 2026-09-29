"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * Time zone for client-rendered dates.
 * Server render and hydration both use UTC so the text matches.
 * After hydration this updates to the browser time zone.
 */
export function useClientTimeZone() {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "UTC",
  );
}
