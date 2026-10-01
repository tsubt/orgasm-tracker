export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startLocktoberCardRefresh } = await import("@/lib/locktober/cardSnapshot");
  startLocktoberCardRefresh();
}
