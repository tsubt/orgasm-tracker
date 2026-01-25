import { auth } from "@/auth";
import Guest from "./components/Guest";
import StatsContent from "./components/StatsContent";
import FollowingSidebar from "./components/FollowingSidebar";
import { Suspense } from "react";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const time = (await searchParams).time ?? "All";

  if (session && session.user && session.user.id) {
    return (
      <main className="w-full p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Main dashboard content - fixed width */}
            <div className="w-full max-w-4xl">
              <StatsContent
                userId={session.user.id}
                time={typeof time === "string" ? time : "All"}
                tz="UTC"
              />
            </div>
            {/* Sidebar - appears below on lg and below, on right on xl+ */}
            <div className="xl:flex-shrink-0">
              <Suspense fallback={null}>
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
