import { prisma } from "@/prisma";

export default async function GlobalStats() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [userCount, orgasmCount, newUsersPast30Days] = await Promise.all([
    prisma.user.count(),
    prisma.orgasm.count(),
    prisma.user.count({
      where: {
        joinedAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),
  ]);

  const stats = [
    {
      title: "Total users",
      value: userCount,
    },
    {
      title: "Total orgasms tracked",
      value: orgasmCount,
    },
    {
      title: "New users (30 days)",
      value: newUsersPast30Days,
    },
  ];

  return (
    <>
      {stats.map((stat) => (
        <div key={stat.title} className="flex flex-col items-center gap-2">
          <div className="font-bold text-4xl text-gray-900 dark:text-white">
            {stat.title === "New users (30 days)" ? `+${stat.value}` : stat.value}
          </div>
          <div className="text-gray-600 dark:text-gray-400">{stat.title}</div>
        </div>
      ))}
    </>
  );
}
