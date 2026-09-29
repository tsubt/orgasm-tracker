import { auth } from "@/auth";
import Guest from "./components/Guest";
import StatsContent from "./components/StatsContent";
import FollowingSidebar from "./components/FollowingSidebar";
import LocktoberParticipants from "./components/LocktoberParticipants";
import { asPeriod } from "@/lib/periods";
import { inDashboardWindowUtc } from "@/lib/locktober/scoring";
import { Suspense } from "react";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const time = (await searchParams).time;

  if (session && session.user && session.user.id) {
    return (
      <main className="w-full p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Main dashboard content - fixed width */}
            <div className="w-full max-w-4xl">
              <StatsContent
                userId={session.user.id}
                initialTime={asPeriod(typeof time === "string" ? time : undefined)}
                tz="UTC"
              />
            </div>
            {/* Sidebar - appears below on lg and below, on right on xl+ */}
            <div className="w-full xl:w-80 xl:flex-shrink-0 space-y-6">
              {inDashboardWindowUtc() && (
                <Suspense fallback={<ParticipantsSkeleton />}>
                  <LocktoberParticipants userId={session.user.id} />
                </Suspense>
              )}
              <Suspense fallback={<FollowingSkeleton />}>
                <FollowingSidebar userId={session.user.id} />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-12 border border-gray-200 dark:border-gray-800 text-center">
        <Guest />
      </div>
    </main>
  );
}

function ParticipantsSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 h-4 w-28 rounded bg-gray-300 dark:bg-gray-700" />
      <div className="mb-3 h-8 rounded-full bg-gray-300 dark:bg-gray-700" />
      <div className="h-8 rounded-full bg-gray-300 dark:bg-gray-700" />
    </div>
  );
}

function FollowingSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 h-4 w-32 rounded bg-gray-300 dark:bg-gray-700" />
      <div className="mb-2 h-4 w-full rounded bg-gray-300 dark:bg-gray-700" />
      <div className="mb-2 h-4 w-5/6 rounded bg-gray-300 dark:bg-gray-700" />
      <div className="h-4 w-2/3 rounded bg-gray-300 dark:bg-gray-700" />
    </div>
  );
}
