"use client";

import { Orgasm } from "@prisma/client";
import YearChart from "./Year";
import { Suspense } from "react";

interface ChartsClientProps {
  orgasms: Orgasm[];
  period: string;
}

export default function ChartsClient({ orgasms, period }: ChartsClientProps) {
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
