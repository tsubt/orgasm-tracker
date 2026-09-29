import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { loadPublicUserCards } from "@/lib/publicUserCards";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || currentUserId;

    const cards = await loadPublicUserCards();

    let followingIds: string[] = [];
    if (userId) {
      const follows = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      followingIds = follows.map((follow) => follow.followingId);
    }

    const users = cards
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
      .map((card) => ({
        id: card.id,
        username: card.username,
        joinedAt: card.joinedAt,
        lastSeen: card.lastSeen,
        trackChastityStatus: card.trackChastityStatus,
        publicOrgasms: card.publicOrgasms,
        orgasmCount: card.orgasmCount,
        lastOrgasmAt: card.lastOrgasmAt,
        activeChastityStart: card.activeChastityStart,
        isFollowing: followingIds.includes(card.id),
      }));

    return NextResponse.json({ users, currentUserId }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
