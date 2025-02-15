import { prisma } from "@/prisma";
import dayjs from "dayjs";
import { Session } from "next-auth";
import { Suspense } from "react";

export default async function Stats({ session }: { session: Session }) {
  if (!session.user || !session.user.id) {
    return <></>;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        <span>Welcome, {session.user.name}</span>
      </p>
      <p className="text-white">Here&apos;s your dashboard</p>

      <Suspense fallback={<LoadingSummaryStats />}>
        <SummaryStats userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function SummaryStats({ userId }: { userId: string }) {
  const orgasms = await prisma.orgasm.findMany({
    where: {
      userId,
    },
  });

  const n = orgasms.length;
  if (n === 0) return <div>No orgasms yet</div>;

  const today = dayjs();

  // find last orgasm date
  const last = orgasms.map((d) => d.date).reduce((a, b) => (a > b ? a : b));
  const daysSinceLast = today.diff(last, "day");

  // wait 5 seconds
  //   await new Promise((resolve) => setTimeout(resolve, 200000));

  return (
    <div className="flex items-center gap-4 text-black">
      <Stat count={n} title="total of" unit={["orgasm", "orgasms"]} />
      <Stat
        count={daysSinceLast + 5}
        title="currently"
        unit={["day without", "days without"]}
      />
    </div>
  );
}

function LoadingSummaryStats() {
  return (
    <div className="flex items-center gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-gray-200 size-30 rounded shadow"
        ></div>
      ))}
    </div>
  );
}

function Stat({
  count,
  title,
  unit,
}: {
  count: number;
  title: string;
  unit: [string, string];
}) {
  return (
    <div className="bg-pink-800 size-30 rounded shadow flex flex-col items-center justify-center gap-2 p-2 text-pink-50">
      <div className="">{title}</div>
      <div className="bold text-4xl">{count}</div>
      <div>{count === 1 ? unit[0] : unit[1]}</div>
    </div>
  );
}
