import { prisma } from "@/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import UserCard from "@/app/components/UserCard";
import type { Orgasm, User, ChastitySession } from "@prisma/client";

type UserWithData = User & {
  orgasms: Orgasm[];
  chastitySessions?: ChastitySession[];
};

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await auth();
  const currentUserId = session?.user?.id;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, publicProfile: true },
  });

  if (!user || !user.publicProfile) {
    notFound();
  }

  // Fetch followers
  const follows = await prisma.follow.findMany({
    where: { followingId: user.id },
    include: {
      follower: {
        include: {
          orgasms: true,
          chastitySessions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const followers: UserWithData[] = follows
    .map((follow) => ({
      ...follow.follower,
      orgasms: follow.follower.orgasms,
      chastitySessions: follow.follower.chastitySessions,
    }))
    .filter((follower) => follower.publicProfile);

  // Get follow status for current user if logged in
  let followingIds: string[] = [];
  if (currentUserId) {
    const currentUserFollows = await prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        followingId: { in: followers.map((f) => f.id) },
      },
      select: { followingId: true },
    });
    followingIds = currentUserFollows.map((f) => f.followingId);
  }

  return (
    <div className="container flex flex-col items-center gap-6 px-4 py-4 md:py-8">
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/u/${username}`}
            className="text-pink-600 dark:text-pink-400 hover:underline text-sm mb-2 inline-block"
          >
            ← Back to @{username}
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Followers
          </h1>
        </div>

        {followers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              @{username} has no followers yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {followers.map((follower) => (
              <UserCard
                key={follower.id}
                user={follower}
                currentUserId={currentUserId}
                isFollowing={followingIds.includes(follower.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
