import { prisma } from "@/prisma";
import YearChart from "./Year";
import { Suspense } from "react";

export default async function Charts({
  userId,
  period,
}: {
  userId: string;
  period: string;
}) {
  const orgasms = await prisma.orgasm.findMany({
    where: {
      userId: userId,
    },
  });

  switch (period) {
    case "Year":
      return (
        <Suspense fallback={<>Loading year chart</>}>
          <YearChart orgasms={orgasms} />
        </Suspense>
      );
    case "Month":
      return <>MONTH OF {orgasms.length} ORGASMS</>;
    case "Week":
      return <>WEEK OF {orgasms.length} ORGASMS</>;
    case "Day":
      return <>DAY OF {orgasms.length} ORGASMS</>;
  }

  return <div>Invalid period selected</div>;
}
