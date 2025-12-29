import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch ALL users (not just public ones) for dev purposes
    const users = await prisma.user.findMany({
      include: {
        orgasms: true,
        _count: {
          select: {
            orgasms: true,
            accounts: true,
            sessions: true,
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("Error fetching all users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
