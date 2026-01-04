import { prisma } from "@/prisma";
import ChartsWithPeriod from "./ChartsWithPeriod";

export default async function Charts({
  userId,
  tz,
}: {
  userId: string;
  tz: string;
}) {
  const orgasms = await prisma.orgasm.findMany({
    where: {
      userId: userId,
    },
  });

  const chastitySessions = await prisma.chastitySession.findMany({
    where: {
      userId: userId,
    },
  });

  return (
    <ChartsWithPeriod
      orgasms={orgasms}
      tz={tz}
      chastitySessions={chastitySessions}
    />
  );
}
