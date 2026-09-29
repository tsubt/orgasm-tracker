import { loadOwnerLocktober } from "@/lib/locktober/load";
import { inDashboardWindowUtc, type TierSnapshot } from "@/lib/locktober/scoring";
import LocktoberBoardView from "./LocktoberBoardView";

export default async function LocktoberBoard({ userId }: { userId: string }) {
  if (!inDashboardWindowUtc()) return null;

  const view = await loadBoard(userId);
  if (!view) return null;
  if (!view.mine && !view.trackChastity) return null;

  return (
    <LocktoberBoardView
      year={view.year}
      trackChastity={view.trackChastity}
      mine={view.mine}
    />
  );
}

async function loadBoard(userId: string): Promise<{
  year: number;
  trackChastity: boolean;
  mine: {
    points: number;
    locked: boolean;
    tiers: TierSnapshot[];
    daysLeft: number | null;
    shareSlug: string;
  } | null;
} | null> {
  try {
    const owner = await loadOwnerLocktober(userId);
    if (!owner) return null;

    const year = new Date().getUTCFullYear();
    const mine =
      owner.challenges.find((challenge) => challenge.year === year) ?? null;

    return {
      year,
      trackChastity: owner.user.trackChastityStatus,
      mine: mine
        ? {
            points: mine.bar.points,
            locked: mine.bar.locked,
            tiers: mine.bar.tiers,
            daysLeft: mine.bar.daysLeft,
            shareSlug: mine.shareSlug,
          }
        : null,
    };
  } catch (error) {
    console.error("Locktober board failed", error);
    return null;
  }
}
