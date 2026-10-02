import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

export function pastTimeError(value: Date, label: string): string | null {
  if (value.getTime() > Date.now()) {
    return `${label} must be in the past`;
  }
  return null;
}

/** Error for a local calendar date and clock time. A later calendar day fails even before a time is chosen. */
export function localPastTimeError(
  date: string,
  time: string,
  label: string,
  timeZone: string,
): string | null {
  if (!date) return null;
  const today = dayjs().tz(timeZone).format("YYYY-MM-DD");
  if (date > today) return `${label} must be in the past`;
  if (!time) return null;
  const parsed = dayjs.tz(`${date} ${time}`, timeZone);
  if (!parsed.isValid()) return null;
  return pastTimeError(parsed.toDate(), label);
}

/** Keep React state in step with native date and time pickers, which sometimes skip React's change event. */
export function watchFields(
  fields: Record<string, (value: string) => void>,
): () => void {
  const cleanups: Array<() => void> = [];
  for (const [id, setValue] of Object.entries(fields)) {
    const node = document.getElementById(id);
    if (!(node instanceof HTMLInputElement)) continue;
    const sync = () => setValue(node.value);
    node.addEventListener("input", sync);
    node.addEventListener("change", sync);
    cleanups.push(() => {
      node.removeEventListener("input", sync);
      node.removeEventListener("change", sync);
    });
  }
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
