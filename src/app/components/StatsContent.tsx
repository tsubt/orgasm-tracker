import { Suspense, type ReactNode } from "react";
import DashboardClient from "./DashboardClient";
import LocktoberBoard from "./LocktoberBoard";
import { loadDashboard } from "@/lib/dashboard";

export default function StatsContent({
  userId,
  initialTime,
  tz,
}: {
  userId: string;
  initialTime: string;
  tz: string;
}) {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardSection
        userId={userId}
        initialTime={initialTime}
        tz={tz}
        locktober={<LocktoberBoard userId={userId} />}
      />
    </Suspense>
  );
}

async function DashboardSection({
  userId,
  initialTime,
  tz,
  locktober,
}: {
  userId: string;
  initialTime: string;
  tz: string;
  locktober: ReactNode;
}) {
  const { orgasms, chastitySessions, user, charts } =
    await loadDashboard(userId);

  if (!user) {
    return (
      <div className="text-gray-700 dark:text-gray-300">User not found</div>
    );
  }

  return (
    <DashboardClient
      orgasms={orgasms}
      chastitySessions={chastitySessions}
      charts={charts}
      joinedAt={user.joinedAt}
      firstDayOfWeek={user.firstDayOfWeek}
      trackChastityStatus={user.trackChastityStatus}
      tz={tz}
      initialTime={initialTime}
      userId={userId}
      locktober={locktober}
    />
  );
}

function DashboardFallback() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded w-64" />
      <div className="h-40 bg-gray-300 dark:bg-gray-700 rounded" />
      <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded" />
    </div>
  );
}
