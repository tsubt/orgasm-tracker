import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/prisma";
import WrappedCarousel from "./WrappedCarousel";

export default async function WrappedPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  const { year } = await params;
  const yearNum = parseInt(year, 10);

  if (isNaN(yearNum)) {
    redirect("/");
  }

  // Fetch user info and orgasms
  const userInfo = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  const orgasms = await prisma.orgasm.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  const username = userInfo?.username || userInfo?.name || "User";
  const joinedAt = userInfo?.joinedAt;

  return (
    <div className="min-h-screen w-full">
      <WrappedCarousel
        orgasms={orgasms}
        year={yearNum}
        username={username}
        joinedAt={joinedAt}
      />
    </div>
  );
}
