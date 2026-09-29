import { Suspense } from "react";
import dynamic from "next/dynamic";
import DashboardCharts from "./DashboardCharts";
import DashboardClient from "./DashboardClient";

const ChastityStatus = dynamic(() => import("./ChastityStatus"));
import FappedLink from "./FappedLink";
import LastOrgasmDisplay from "./LastOrgasmDisplay";
import LocktoberBoard from "./LocktoberBoard";
import CalendarChartSkeleton from "./charts/CalendarChartSkeleton";
import {
  loadActiveChastity,
  loadDashboardChartConfig,
  loadDashboardChastity,
  loadDashboardOrgasms,
  loadDashboardUser,
  loadLastOrgasm,
} from "@/lib/dashboard";
import { inDashboardWindowUtc } from "@/lib/locktober/scoring";

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
    <div className="flex flex-col gap-6 w-full">
      <Suspense fallback={<HeaderSkeleton />}>
        <DashboardHeader userId={userId} />
      </Suspense>
      {inDashboardWindowUtc() && (
        <Suspense fallback={<LocktoberSkeleton />}>
          <LocktoberBoard userId={userId} />
        </Suspense>
      )}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats userId={userId} initialTime={initialTime} tz={tz} />
      </Suspense>
      <Suspense fallback={<ChartsSkeleton />}>
        <DashboardChartsSection userId={userId} tz={tz} />
      </Suspense>
    </div>
  );
}

async function DashboardHeader({ userId }: { userId: string }) {
  const [user, last, activeSession] = await Promise.all([
    loadDashboardUser(userId),
    loadLastOrgasm(userId),
    loadActiveChastity(userId),
  ]);

  if (!user) {
    return (
      <div className="text-gray-700 dark:text-gray-300">User not found</div>
    );
  }

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <LastOrgasmDisplay timestamp={last?.timestamp ?? null} />
        <FappedLink />
      </div>
      {user.trackChastityStatus && (
        <ChastityStatus
          trackChastityStatus={user.trackChastityStatus}
          activeSession={activeSession}
        />
      )}
    </>
  );
}

async function DashboardStats({
  userId,
  initialTime,
  tz,
}: {
  userId: string;
  initialTime: string;
  tz: string;
}) {
  const [orgasms, user] = await Promise.all([
    loadDashboardOrgasms(userId),
    loadDashboardUser(userId),
  ]);

  if (!user) return null;

  return (
    <DashboardClient
      orgasms={orgasms}
      joinedAt={user.joinedAt}
      tz={tz}
      initialTime={initialTime}
    />
  );
}

async function DashboardChartsSection({
  userId,
  tz,
}: {
  userId: string;
  tz: string;
}) {
  const [charts, user] = await Promise.all([
    loadDashboardChartConfig(userId),
    loadDashboardUser(userId),
  ]);
  const firstDayOfWeek = user?.firstDayOfWeek ?? 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-4 p-4 w-full">
      <Suspense
        fallback={
          <ChartPlaceholders charts={charts.map((chart) => chart.chartName)} />
        }
      >
        <DashboardChartsLoaded
          userId={userId}
          tz={tz}
          charts={charts}
          firstDayOfWeek={firstDayOfWeek}
        />
      </Suspense>
    </div>
  );
}

async function DashboardChartsLoaded({
  userId,
  tz,
  charts,
  firstDayOfWeek,
}: {
  userId: string;
  tz: string;
  charts: Awaited<ReturnType<typeof loadDashboardChartConfig>>;
  firstDayOfWeek: number;
}) {
  const [orgasms, chastitySessions] = await Promise.all([
    loadDashboardOrgasms(userId),
    loadDashboardChastity(userId),
  ]);

  return (
    <DashboardCharts
      orgasms={orgasms}
      tz={tz}
      userId={userId}
      chastitySessions={chastitySessions}
      firstDayOfWeek={firstDayOfWeek}
      charts={charts}
    />
  );
}

function ChartPlaceholders({ charts }: { charts: string[] }) {
  if (charts.length === 0) return <ChartsSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      {charts.map((chartName, index) =>
        chartName === "Calendar" ? (
          <CalendarChartSkeleton key={`${chartName}-${index}`} />
        ) : (
          <div
            key={`${chartName}-${index}`}
            className="h-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
          />
        ),
      )}
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-64 rounded bg-gray-300 dark:bg-gray-700" />
        <div className="h-4 w-48 rounded bg-gray-300 dark:bg-gray-700" />
      </div>
      <div className="h-20 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800" />
    </div>
  );
}

function LocktoberSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 h-5 w-36 rounded bg-gray-300 dark:bg-gray-700" />
      <div className="h-8 rounded-full bg-gray-300 dark:bg-gray-700" />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex gap-4">
        <div className="h-4 w-10 rounded bg-gray-300 dark:bg-gray-700" />
        <div className="h-4 w-16 rounded bg-gray-300 dark:bg-gray-700" />
        <div className="h-4 w-20 rounded bg-gray-300 dark:bg-gray-700" />
        <div className="h-4 w-14 rounded bg-gray-300 dark:bg-gray-700" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:flex md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 w-full animate-pulse rounded bg-gray-300 dark:bg-gray-700 md:size-30"
          />
        ))}
      </div>
      <div className="h-8 animate-pulse rounded-full bg-gray-300 dark:bg-gray-700" />
      <div className="h-8 animate-pulse rounded-full bg-gray-300 dark:bg-gray-700" />
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="h-64 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
    </div>
  );
}
