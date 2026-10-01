import { auth } from "@/auth";
import {
  loadChallengeBySlug,
  loadChastitySpans,
  serializeChallenge,
} from "@/lib/locktober/load";
import type { LocktoberCalendarDay } from "@/lib/locktober/calendar";
import { locktoberDisplayName, saveLocktoberCard } from "@/lib/locktober/cardSnapshot";
import { locktoberShareDescription } from "@/lib/locktober/shareLine";
import { BarView, focusYear } from "@/lib/locktober/scoring";
import { prisma } from "@/prisma";
import dayjs from "dayjs";
import type { Metadata } from "next";
import { headers } from "next/headers";
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

function requestOrigin(headerList: Headers) {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return "";
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

function shareCard(args: {
  slug: string;
  username: string | null;
  name: string | null;
  year: number;
  bar: BarView;
  calendar: LocktoberCalendarDay[];
  imageVersion: number | null;
  origin: string;
}): Metadata {
  const display = args.username ? `@${args.username}` : args.name || "Someone";
  const title = `${display}'s Locktober ${args.year}`;
  const description = locktoberShareDescription(args.calendar, {
    points: args.bar.points,
    daysLeft: args.bar.daysLeft,
    tiers: args.bar.tiers,
  });
  const image =
    args.imageVersion == null
      ? undefined
      : `${args.origin}/locktober/s/${args.slug}/card?v=${args.imageVersion}`;
  return {
    title: `${title} · OrgasmTracker`,
    description,
    openGraph: {
      title,
      description,
      siteName: "OrgasmTracker",
      type: "website",
      images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
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

  const lockedMinutes = loaded.serialized.calendar.reduce(
    (sum, day) => sum + (day.lockedMinutes ?? 0),
    0,
  );
  const refreshedAt = await saveLocktoberCard({
    challengeId: loaded.challenge.id,
    year: loaded.serialized.year,
    display: locktoberDisplayName(loaded.owner?.username, loaded.owner?.name),
    username: loaded.owner?.username ?? null,
    shareSlug: loaded.serialized.shareSlug,
    visibility: loaded.serialized.visibility,
    lockedMinutes,
    points: loaded.serialized.bar.points,
    daysLeft: loaded.serialized.bar.daysLeft,
    targets: loaded.serialized.bar.tiers.map((tier) => ({
      label: tier.label,
      points: tier.points,
    })),
  });
  const headerList = await headers();

  return shareCard({
    slug,
    username: loaded.owner?.username ?? null,
    name: loaded.owner?.name ?? null,
    year: loaded.serialized.year,
    bar: loaded.serialized.bar,
    calendar: loaded.serialized.calendar,
    imageVersion: refreshedAt.getTime(),
    origin: requestOrigin(headerList),
  });
}

export default async function LocktoberSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { slug } = await params;
  const { v } = await searchParams;
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
    const version = v && /^\d+$/.test(v) ? `?v=${v}` : "";
    redirect(`/locktober/s/${owner.username}${version}`);
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
