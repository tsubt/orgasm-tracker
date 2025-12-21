import { prisma } from "@/prisma";
import { NextResponse } from "next/server";
import dayjs from "dayjs";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        publicProfile: true,
      },
      include: {
        orgasms: true,
      },
    });

    // Sort by lastSeen (most recent first)
    const sortedUsers = users.sort((a, b) =>
      dayjs(a.lastSeen).isAfter(dayjs(b.lastSeen)) ? -1 : 1
    );

    return NextResponse.json({ users: sortedUsers }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
