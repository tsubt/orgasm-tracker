import { auth } from "@/auth";
import {
  loadChallengeBySlug,
  loadChastitySpans,
  serializeChallenge,
} from "@/lib/locktober/load";
import type { LocktoberCalendarDay } from "@/lib/locktober/calendar";
import { locktoberShareDescription } from "@/lib/locktober/shareLine";
import { BarView, focusYear } from "@/lib/locktober/scoring";
import { prisma } from "@/prisma";
import dayjs from "dayjs";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import ShareView, { ShareComment } from "./ShareView";

const GENERIC_CARD: Metadata = {
  title: "Locktober · OrgasmTracker",
  description: "A Locktober challenge on OrgasmTracker.",
};

const loadShare = cache(async (slug: string) => {
  const challenge = await loadChallengeBySlug(slug);
  if (!challenge) return null;
  const [owner, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: challenge.userId },
      select: { username: true, name: true, firstDayOfWeek: true },
    }),
    loadChastitySpans(challenge.userId, challenge.year),
  ]);
  return {
    challenge,
    owner,
    serialized: serializeChallenge(challenge, sessions),
  };
});

function shareCard(args: {
  username: string | null;
  name: string | null;
  year: number;
  bar: BarView;
  calendar: LocktoberCalendarDay[];
}): Metadata {
  const display = args.username ? `@${args.username}` : args.name || "Someone";
  const title = `${display}'s Locktober ${args.year}`;
  const description = locktoberShareDescription(args.calendar, args.bar);
  return {
    title: `${title} · OrgasmTracker`,
    description,
    openGraph: {
      title,
      description,
      siteName: "OrgasmTracker",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadShare(slug);
  if (!loaded) return GENERIC_CARD;

  const session = await auth();
  const isOwner = session?.user?.id === loaded.challenge.userId;
  if (loaded.challenge.visibility === "PRIVATE" && !isOwner) return GENERIC_CARD;

  return shareCard({
    username: loaded.owner?.username ?? null,
    name: loaded.owner?.name ?? null,
    year: loaded.serialized.year,
    bar: loaded.serialized.bar,
    calendar: loaded.serialized.calendar,
  });
}

export default async function LocktoberSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const loaded = await loadShare(slug);
  if (!loaded) notFound();
  const { challenge, owner, serialized } = loaded;

  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const isOwner = viewerId === challenge.userId;
  if (challenge.visibility === "PRIVATE" && !isOwner) notFound();
  if (
    challenge.visibility === "PUBLIC" &&
    owner?.username &&
    slug !== owner.username &&
    challenge.year === focusYear(dayjs())
  ) {
    redirect(`/locktober/s/${owner.username}`);
  }

  const [comments, like] = await Promise.all([
    prisma.locktoberComment.findMany({
      where: { challengeId: challenge.id },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, username: true, name: true } },
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
  ]);

  const shareComments: ShareComment[] = comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    userId: comment.user.id,
    username: comment.user.username,
    name: comment.user.name,
  }));

  return (
    <div className="w-full p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <ShareView
          slug={serialized.shareSlug}
          year={serialized.year}
          username={owner?.username ?? null}
          name={owner?.name ?? null}
          bar={serialized.bar}
          tasks={serialized.tasks}
          calendar={serialized.calendar}
          tiers={serialized.tiers}
          firstDayOfWeek={owner?.firstDayOfWeek ?? 1}
          likeCount={serialized.likeCount}
          liked={Boolean(like)}
          comments={shareComments}
          viewerId={viewerId}
          isOwner={isOwner}
          timeZone={serialized.timezone}
          serverNow={new Date().toISOString()}
        />
      </div>
    </div>
  );
}
