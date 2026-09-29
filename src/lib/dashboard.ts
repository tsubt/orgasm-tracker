import { prisma } from "@/prisma";
import { cache } from "react";

export const loadDashboardUser = cache(async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      trackChastityStatus: true,
      firstDayOfWeek: true,
      joinedAt: true,
    },
  });
});

export const loadDashboardOrgasms = cache(async (userId: string) => {
  return prisma.orgasm.findMany({
    where: { userId },
    orderBy: { timestamp: "asc" },
  });
});

export const loadDashboardChastity = cache(async (userId: string) => {
  return prisma.chastitySession.findMany({
    where: { userId },
  });
});

export const loadActiveChastity = cache(async (userId: string) => {
  return prisma.chastitySession.findFirst({
    where: { userId, endTime: null },
    select: { id: true, startTime: true, endTime: true, note: true },
  });
});

export const loadLastOrgasm = cache(async (userId: string) => {
  return prisma.orgasm.findFirst({
    where: { userId, timestamp: { not: null } },
    orderBy: { timestamp: "desc" },
    select: { timestamp: true },
  });
});

export const loadDashboardChartConfig = cache(async (userId: string) => {
  return prisma.dashboardChart.findMany({
    where: { userId },
    orderBy: { chartPosition: "asc" },
  });
});
