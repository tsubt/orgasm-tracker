"use client";

import { useState } from "react";
import { Orgasm } from "@prisma/client";
import PickPeriod from "./PickPeriod";
import ChartsClient from "./ChartsClient";

interface ChartsWithPeriodProps {
  orgasms: Orgasm[];
}

export default function ChartsWithPeriod({ orgasms }: ChartsWithPeriodProps) {
  const [period, setPeriod] = useState<string>("Year");

  return (
    <>
      <PickPeriod period={period} onPeriodChange={setPeriod} />
      <ChartsClient orgasms={orgasms} period={period} />
    </>
  );
}
