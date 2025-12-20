import { Suspense } from "react";
import GlobalStats from "./GlobalStats";

export default function StatsPage() {
  return (
    <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
      <h2 className="text-lg font-bold uppercase tracking-wider text-white">
        Statistics
      </h2>

      <div className="flex justify-center gap-8 text-center text-white">
        <Suspense fallback={<div>Loading...</div>}>
          <GlobalStats />
        </Suspense>
      </div>
    </div>
  );
}
