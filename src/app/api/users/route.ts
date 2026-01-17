import { prisma } from "@/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dayjs from "dayjs";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || currentUserId;

    const users = await prisma.user.findMany({
      where: {
        publicProfile: true,
      },
      include: {
        orgasms: true,
        chastitySessions: true,
      },
    });

    // Get follow status for current user if logged in
    let followingIds: string[] = [];
    if (userId) {
      const follows = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      followingIds = follows.map((f) => f.followingId);
    }

    // Add follow status to each user
    const usersWithFollowStatus = users.map((user) => ({
      ...user,
      isFollowing: followingIds.includes(user.id),
    }));

    // Sort by most recent activity (orgasm or chastity session event)
    const sortedUsers = usersWithFollowStatus.sort((a, b) => {
      // Find most recent event for user A
      const aEvents: number[] = [];
      if (a.orgasms && a.orgasms.length > 0) {
        a.orgasms
          .filter((o) => o.timestamp !== null)
          .forEach((o) => aEvents.push(dayjs(o.timestamp!).valueOf()));
      }
      if (a.chastitySessions && a.chastitySessions.length > 0) {
        a.chastitySessions.forEach((s) => {
          aEvents.push(dayjs(s.startTime).valueOf());
          if (s.endTime) {
            aEvents.push(dayjs(s.endTime).valueOf());
          }
        });
      }
      // Fallback to lastSeen if no events
      const aMostRecent = aEvents.length > 0 ? Math.max(...aEvents) : dayjs(a.lastSeen).valueOf();

      // Find most recent event for user B
      const bEvents: number[] = [];
      if (b.orgasms && b.orgasms.length > 0) {
        b.orgasms
          .filter((o) => o.timestamp !== null)
          .forEach((o) => bEvents.push(dayjs(o.timestamp!).valueOf()));
      }
      if (b.chastitySessions && b.chastitySessions.length > 0) {
        b.chastitySessions.forEach((s) => {
          bEvents.push(dayjs(s.startTime).valueOf());
          if (s.endTime) {
            bEvents.push(dayjs(s.endTime).valueOf());
          }
        });
      }
      // Fallback to lastSeen if no events
      const bMostRecent = bEvents.length > 0 ? Math.max(...bEvents) : dayjs(b.lastSeen).valueOf();

      return bMostRecent - aMostRecent; // Most recent first
    });

    return NextResponse.json({ users: sortedUsers, currentUserId }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
