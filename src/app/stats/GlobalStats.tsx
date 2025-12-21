import { prisma } from "@/prisma";

export default async function GlobalStats() {
  const [userCount, orgasmCount] = await Promise.all([
    prisma.user.count(),
    prisma.orgasm.count(),
  ]);

  const stats = [
    {
      title: "User" + (userCount === 1 ? "" : "s"),
      value: userCount,
    },
    {
      title: "Orgasm" + (orgasmCount === 1 ? "" : "s"),
      value: orgasmCount,
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
