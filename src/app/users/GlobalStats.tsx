import { prisma } from "@/prisma";

export default async function GlobalStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [userCount, orgasmCount, newUsersThisMonth] = await Promise.all([
    prisma.user.count(),
    prisma.orgasm.count(),
    prisma.user.count({
      where: {
        joinedAt: {
          gte: startOfMonth,
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
      title: "New users this month",
      value: newUsersThisMonth,
    },
  ];

  return (
    <>
      {stats.map((stat) => (
        <div key={stat.title} className="flex flex-col items-center gap-2">
          <div className="font-bold text-4xl text-gray-900 dark:text-white">
            {stat.value}
          </div>
          <div className="text-gray-600 dark:text-gray-400">{stat.title}</div>
        </div>
      ))}
    </>
  );
}
