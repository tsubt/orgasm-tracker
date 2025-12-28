import { prisma } from "@/prisma";
import { notFound } from "next/navigation";
import WrappedCarousel from "../WrappedCarousel";

export default async function SharedWrappedPage({
  params,
}: {
  params: Promise<{ year: string; username: string }>;
}) {
  const { year, username } = await params;
  const yearNum = parseInt(year, 10);

  if (isNaN(yearNum)) {
    notFound();
  }

  // Find user by username
  const userInfo = await prisma.user.findUnique({
    where: {
      username: username,
    },
  });

  if (!userInfo) {
    notFound();
  }

  // Fetch user's orgasms (no privacy restrictions since user said they're not worried)
  const orgasms = await prisma.orgasm.findMany({
    where: {
      userId: userInfo.id,
    },
    orderBy: {
      date: "asc",
    },
  });

  const displayUsername = userInfo.username || userInfo.name || "User";

  return (
    <div className="min-h-screen w-full">
      <WrappedCarousel
        orgasms={orgasms}
        year={yearNum}
        username={displayUsername}
      />
    </div>
  );
}
