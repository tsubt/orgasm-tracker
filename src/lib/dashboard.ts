import { prisma } from "@/prisma";

export async function loadDashboard(userId: string) {
  const [orgasms, chastitySessions, user, charts] = await Promise.all([
    prisma.orgasm.findMany({
      where: { userId },
      orderBy: { timestamp: "asc" },
    }),
    prisma.chastitySession.findMany({
      where: { userId },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        trackChastityStatus: true,
        firstDayOfWeek: true,
        joinedAt: true,
      },
    }),
    prisma.dashboardChart.findMany({
      where: { userId },
      orderBy: { chartPosition: "asc" },
    }),
  ]);

  return { orgasms, chastitySessions, user, charts };
}
