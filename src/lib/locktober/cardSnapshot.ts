import { prisma } from "@/prisma";
import { LocktoberVisibility } from "@prisma/client";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { ensureCumDayLocks } from "./locks";
import { loadChallengeById, loadChastitySpans, serializeChallenge } from "./load";
import {
  countLabel,
  countdownReward,
  daysLeftPhrase,
  lockedHoursFromMinutes,
  type RewardTarget,
} from "./shareLine";
import { focusYear } from "./scoring";

dayjs.extend(utc);
dayjs.extend(timezone);

const FRESH_MS = 60 * 60 * 1000;

export type LocktoberCardStats = {
  challengeId: string;
  year: number;
  display: string;
  username: string | null;
  shareSlug: string;
  visibility: LocktoberVisibility;
  lockedMinutes: number;
  points: number;
  daysLeft: number | null;
  targets: RewardTarget[];
  refreshedAt: Date;
};

function hoursKey(minutes: number) {
  return lockedHoursFromMinutes(minutes);
}

function sameCard(
  existing: Omit<LocktoberCardStats, "targets" | "refreshedAt"> & { targets: unknown },
  next: Omit<LocktoberCardStats, "refreshedAt">,
) {
  return (
    existing.year === next.year &&
    existing.display === next.display &&
    existing.username === next.username &&
    existing.shareSlug === next.shareSlug &&
    existing.visibility === next.visibility &&
    existing.points === next.points &&
    existing.daysLeft === next.daysLeft &&
    hoursKey(existing.lockedMinutes) === hoursKey(next.lockedMinutes) &&
    JSON.stringify(cardTargets(existing.targets)) === JSON.stringify(next.targets)
  );
}

export function cardTargets(value: unknown): RewardTarget[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as { label?: unknown; points?: unknown };
      if (typeof record.label !== "string" || typeof record.points !== "number") return [];
      return [{ label: record.label, points: record.points }];
    })
    .sort((a, b) => a.points - b.points);
}

/** Write the snapshot when the visible stats changed. Returns the timestamp used in the image URL. */
export async function saveLocktoberCard(
  next: Omit<LocktoberCardStats, "refreshedAt">,
): Promise<Date> {
  const existing = await prisma.locktoberCard.findUnique({
    where: { challengeId: next.challengeId },
  });
  if (existing && sameCard(existing, next)) return existing.refreshedAt;

  const refreshedAt = new Date();
  await prisma.locktoberCard.upsert({
    where: { challengeId: next.challengeId },
    create: { ...next, refreshedAt },
    update: { ...next, refreshedAt },
  });
  return refreshedAt;
}

export function locktoberDisplayName(username: string | null | undefined, name: string | null | undefined) {
  return username ? `@${username}` : name || "Someone";
}

export async function refreshLocktoberCard(challengeId: string) {
  await ensureCumDayLocks(challengeId);
  const challenge = await loadChallengeById(challengeId);
  if (!challenge) {
    await prisma.locktoberCard.deleteMany({ where: { challengeId } });
    return;
  }
  const [sessions, user] = await Promise.all([
    loadChastitySpans(challenge.userId, challenge.year),
    prisma.user.findUnique({
      where: { id: challenge.userId },
      select: { username: true, name: true },
    }),
  ]);
  const serialized = serializeChallenge(challenge, sessions);
  const lockedMinutes = serialized.calendar.reduce(
    (sum, day) => sum + (day.lockedMinutes ?? 0),
    0,
  );
  await saveLocktoberCard({
    challengeId,
    year: serialized.year,
    display: locktoberDisplayName(user?.username, user?.name),
    username: user?.username ?? null,
    shareSlug: serialized.shareSlug,
    visibility: serialized.visibility,
    lockedMinutes,
    points: serialized.bar.points,
    daysLeft: serialized.bar.daysLeft,
    targets: serialized.bar.tiers.map((tier) => ({
      label: tier.label,
      points: tier.points,
    })),
  });
}

export async function refreshLocktoberCardsForUser(userId: string) {
  const challenges = await prisma.locktoberChallenge.findMany({
    where: { userId },
    select: { id: true },
  });
  for (const challenge of challenges) {
    await refreshLocktoberCard(challenge.id);
  }
}

export async function refreshCurrentLocktoberCards() {
  const year = focusYear(dayjs());
  const challenges = await prisma.locktoberChallenge.findMany({
    where: { year },
    select: { id: true },
  });
  for (const challenge of challenges) {
    try {
      await refreshLocktoberCard(challenge.id);
    } catch (error) {
      console.error("Locktober card refresh failed", challenge.id, error);
    }
  }
  return challenges.length;
}

async function challengeIdForSlug(slug: string) {
  const bySlug = await prisma.locktoberChallenge.findUnique({
    where: { shareSlug: slug },
    select: { id: true },
  });
  if (bySlug) return bySlug.id;

  const user = await prisma.user.findUnique({
    where: { username: slug },
    select: { id: true },
  });
  if (!user) return null;
  const challenge = await prisma.locktoberChallenge.findFirst({
    where: {
      userId: user.id,
      visibility: "PUBLIC",
      year: focusYear(dayjs()),
    },
    select: { id: true },
  });
  return challenge?.id ?? null;
}

export async function readLocktoberCard(slug: string) {
  const bySlug = await prisma.locktoberCard.findUnique({ where: { shareSlug: slug } });
  if (bySlug) return bySlug;

  return prisma.locktoberCard.findFirst({
    where: {
      username: slug,
      visibility: "PUBLIC",
      year: focusYear(dayjs()),
    },
  });
}

/** One indexed read. Recompute only when the row is missing or older than an hour. */
export async function ensureLocktoberCard(slug: string) {
  const existing = await readLocktoberCard(slug);
  const fresh = existing && Date.now() - existing.refreshedAt.getTime() < FRESH_MS;
  if (fresh && cardTargets(existing.targets).length > 0) return existing;

  const challengeId = existing?.challengeId ?? (await challengeIdForSlug(slug));
  if (!challengeId) return existing;
  await refreshLocktoberCard(challengeId);
  return readLocktoberCard(slug);
}

export function locktoberCardLines(card: {
  lockedMinutes: number;
  points: number;
  daysLeft: number | null;
  targets?: unknown;
}) {
  return {
    hours: lockedHoursFromMinutes(card.lockedMinutes),
    points: countLabel(card.points, "point", "points"),
    days: daysLeftPhrase(card.daysLeft, countdownReward(card.points, cardTargets(card.targets))),
  };
}

const globalForCards = globalThis as { locktoberCardTimer?: ReturnType<typeof setInterval> };

export function startLocktoberCardRefresh() {
  if (globalForCards.locktoberCardTimer) return;
  void refreshCurrentLocktoberCards().catch((error) => {
    console.error("Locktober card refresh failed", error);
  });
  globalForCards.locktoberCardTimer = setInterval(() => {
    void refreshCurrentLocktoberCards().catch((error) => {
      console.error("Locktober card refresh failed", error);
    });
  }, FRESH_MS);
  globalForCards.locktoberCardTimer.unref?.();
}
