import { prisma } from "@/prisma";
import { loadPublicBoard } from "@/lib/locktober/load";
import { inDashboardWindowUtc } from "@/lib/locktober/scoring";
import LocktoberParticipantsView from "./LocktoberParticipantsView";

export default async function LocktoberParticipants({ userId }: { userId: string }) {
  if (!inDashboardWindowUtc()) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hideLocktoberBoard: true },
  });
  if (!user || user.hideLocktoberBoard) return null;

  const year = new Date().getUTCFullYear();
  const mine = await prisma.locktoberChallenge.findUnique({
    where: { userId_year: { userId, year } },
    select: { id: true },
  });
  const participants = (await loadPublicBoard(year)).filter(
    (card) => card.id !== mine?.id,
  );

  return <LocktoberParticipantsView year={year} participants={participants} />;
}
