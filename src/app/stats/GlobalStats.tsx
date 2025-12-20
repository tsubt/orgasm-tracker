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
        <div key={stat.title}>
          <div className="text-bold text-4xl">{stat.value}</div>
          <div className="">{stat.title}</div>
        </div>
      ))}
    </>
  );
}
