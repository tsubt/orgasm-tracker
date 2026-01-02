import { prisma } from "@/prisma";
import ChartsWithPeriod from "./ChartsWithPeriod";

export default async function Charts({
  userId,
}: {
  userId: string;
}) {
  const orgasms = await prisma.orgasm.findMany({
    where: {
      userId: userId,
    },
  });

  return <ChartsWithPeriod orgasms={orgasms} />;
}
