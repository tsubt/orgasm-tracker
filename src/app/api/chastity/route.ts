import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { NextResponse } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessions = await prisma.chastitySession.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { startTime: "desc" },
    });

    return NextResponse.json({ sessions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching chastity sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { startTime, endTime, note } = body;

    // Validate input
    if (!startTime) {
      return NextResponse.json(
        { error: "Missing required field: startTime" },
        { status: 400 }
      );
    }

    // Parse timestamps
    const startTimeDate = new Date(startTime);
    if (isNaN(startTimeDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid startTime format" },
        { status: 400 }
      );
    }

    let endTimeDate: Date | null = null;
    if (endTime) {
      endTimeDate = new Date(endTime);
      if (isNaN(endTimeDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid endTime format" },
          { status: 400 }
        );
      }
      // Validate that endTime is after startTime
      if (endTimeDate <= startTimeDate) {
        return NextResponse.json(
          { error: "endTime must be after startTime" },
          { status: 400 }
        );
      }
    }

    // Check if there's an active session (no endTime) for this user
    if (!endTime) {
      const activeSession = await prisma.chastitySession.findFirst({
        where: {
          userId: session.user.id,
          endTime: null,
        },
      });

      if (activeSession) {
        return NextResponse.json(
          { error: "There is already an active session. Please end it first." },
          { status: 400 }
        );
      }
    }

    // Create the session
    const chastitySession = await prisma.chastitySession.create({
      data: {
        userId: session.user.id,
        startTime: startTimeDate,
        endTime: endTimeDate,
        note: note || null,
      },
    });

    return NextResponse.json(
      { success: true, session: chastitySession },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating chastity session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, startTime, endTime, note } = body;

    // Validate input
    if (!id || !startTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the session belongs to the user
    const existingSession = await prisma.chastitySession.findUnique({
      where: { id },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (existingSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse timestamps
    const startTimeDate = new Date(startTime);
    if (isNaN(startTimeDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid startTime format" },
        { status: 400 }
      );
    }

    let endTimeDate: Date | null = null;
    if (endTime) {
      endTimeDate = new Date(endTime);
      if (isNaN(endTimeDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid endTime format" },
          { status: 400 }
        );
      }
      // Validate that endTime is after startTime
      if (endTimeDate <= startTimeDate) {
        return NextResponse.json(
          { error: "endTime must be after startTime" },
          { status: 400 }
        );
      }
    }

    // If we're ending a session (setting endTime when it was null), check for other active sessions
    if (endTime && !existingSession.endTime) {
      const otherActiveSession = await prisma.chastitySession.findFirst({
        where: {
          userId: session.user.id,
          endTime: null,
          id: { not: id },
        },
      });

      if (otherActiveSession) {
        return NextResponse.json(
          { error: "There is already another active session." },
          { status: 400 }
        );
      }
    }

    // Update the session
    const updatedSession = await prisma.chastitySession.update({
      where: { id },
      data: {
        startTime: startTimeDate,
        endTime: endTimeDate,
        note: note || null,
      },
    });

    return NextResponse.json(
      { success: true, session: updatedSession },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating chastity session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing session ID" },
        { status: 400 }
      );
    }

    // Verify the session belongs to the user
    const existingSession = await prisma.chastitySession.findUnique({
      where: { id },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (existingSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the session
    await prisma.chastitySession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting chastity session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
