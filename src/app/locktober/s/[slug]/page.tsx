import { auth } from "@/auth";
import {
  loadChallengeBySlug,
  loadChastitySpans,
  serializeChallenge,
} from "@/lib/locktober/load";
import { prisma } from "@/prisma";
import { notFound } from "next/navigation";
import ShareView, { ShareComment } from "./ShareView";

export default async function LocktoberSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const challenge = await loadChallengeBySlug(slug);
  if (!challenge) notFound();

  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const isOwner = viewerId === challenge.userId;
  if (challenge.visibility === "PRIVATE" && !isOwner) notFound();

  const [comments, like, owner] = await Promise.all([
    prisma.locktoberComment.findMany({
      where: { challengeId: challenge.id },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, username: true, name: true, image: true } },
      },
    }),
    viewerId
      ? prisma.locktoberLike.findUnique({
          where: {
            challengeId_userId: { challengeId: challenge.id, userId: viewerId },
          },
          select: { id: true },
        })
      : null,
    prisma.user.findUnique({
      where: { id: challenge.userId },
      select: { username: true, name: true, image: true },
    }),
  ]);

  const sessions = await loadChastitySpans(challenge.userId, challenge.year);
  const serialized = serializeChallenge(challenge, sessions);
  const shareComments: ShareComment[] = comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    userId: comment.user.id,
    username: comment.user.username,
    name: comment.user.name,
    image: comment.user.image,
  }));

  return (
    <div className="w-full p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <ShareView
          slug={serialized.shareSlug}
          year={serialized.year}
          username={owner?.username ?? null}
          name={owner?.name ?? null}
          image={owner?.image ?? null}
          bar={serialized.bar}
          cumDays={serialized.cumDays.map((day) => ({
            date: day.date,
            status: day.status,
            claimedTierLabel: day.claimedTierLabel,
            pointsAtLock: day.pointsAtLock,
          }))}
          likeCount={serialized.likeCount}
          liked={Boolean(like)}
          comments={shareComments}
          viewerId={viewerId}
          isOwner={isOwner}
        />
      </div>
    </div>
  );
}
