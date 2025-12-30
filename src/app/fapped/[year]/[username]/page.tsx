import { prisma } from "@/prisma";
import { notFound } from "next/navigation";
import WrappedCarousel from "../WrappedCarousel";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; username: string }>;
}): Promise<Metadata> {
  const { year, username } = await params;
  const yearNum = parseInt(year, 10);

  if (isNaN(yearNum)) {
    return {
      title: "Fapped Wrapped - Not Found",
    };
  }

  // Find user by username
  const userInfo = await prisma.user.findUnique({
    where: {
      username: username,
    },
  });

  if (!userInfo) {
    return {
      title: "Fapped Wrapped - User Not Found",
    };
  }

  const displayUsername = userInfo.username || userInfo.name || "User";

  // Count orgasms for the year
  const orgasms = await prisma.orgasm.findMany({
    where: {
      userId: userInfo.id,
      timestamp: {
        gte: new Date(`${yearNum}-01-01`),
        lt: new Date(`${yearNum + 1}-01-01`),
      },
    },
  });

  const orgasmCount = orgasms.length;

  return {
    title: `${displayUsername}'s ${year} Fapped Wrapped`,
    description: `View ${displayUsername}'s ${year} orgasm statistics and insights. ${orgasmCount} orgasm${
      orgasmCount !== 1 ? "s" : ""
    } recorded in ${year}.`,
  };
}

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
      timestamp: "asc",
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
