"use client";

import ChastityTable from "./ChastityTable";
import RecordChastitySession from "./RecordChastitySession";

export default function ChastityPageContent() {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold uppercase tracking-wider text-gray-900 dark:text-white">
          Chastity Sessions
        </h2>
        <RecordChastitySession />
      </div>
      <div className="flex-1">
        <ChastityTable />
      </div>
    </>
  );
}
