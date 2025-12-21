import { Suspense } from "react";
import GlobalStats from "./GlobalStats";

export default function StatsPage() {
  return (
    <div className="w-full p-8">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-12">
        <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 dark:text-white">
          Statistics
        </h2>

        <div className="flex justify-center gap-8 text-center text-gray-900 dark:text-white">
          <Suspense
            fallback={
              <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            }
          >
            <GlobalStats />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
