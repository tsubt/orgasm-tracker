export function pastTimeError(value: Date, label: string): string | null {
  if (value.getTime() > Date.now()) {
    return `${label} must be in the past`;
  }
  return null;
}
