import { prisma } from "@/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import UserCard from "@/app/components/UserCard";
import { loadPublicUserCards } from "@/lib/publicUserCards";

export default async function FollowingPage({
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

  const follows = await prisma.follow.findMany({
    where: { followerId: user.id },
    select: { followingId: true },
    orderBy: { createdAt: "desc" },
  });

  const cards = await loadPublicUserCards(follows.map((follow) => follow.followingId));
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const following = follows.flatMap((follow) => {
    const card = cardsById.get(follow.followingId);
    return card ? [card] : [];
  });

  // Get follow status for current user if logged in
  let followingIds: string[] = [];
  if (currentUserId) {
    const currentUserFollows = await prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        followingId: { in: following.map((f) => f.id) },
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
            Following
          </h1>
        </div>

        {following.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              @{username} is not following anyone yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {following.map((followedUser) => (
              <UserCard
                key={followedUser.id}
                user={followedUser}
                currentUserId={currentUserId}
                isFollowing={followingIds.includes(followedUser.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
