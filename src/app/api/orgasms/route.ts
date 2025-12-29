import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { OrgasmType, SexType } from "@prisma/client";
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

    const orgasms = await prisma.orgasm.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json({ orgasms }, { status: 200 });
  } catch (error) {
    console.error("Error fetching orgasms:", error);
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
    const { timestamp, type, sex, note } = body;

    // Validate input
    if (!timestamp || !type || !sex) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate enum values
    if (!Object.values(OrgasmType).includes(type)) {
      return NextResponse.json(
        { error: "Invalid orgasm type" },
        { status: 400 }
      );
    }

    if (!Object.values(SexType).includes(sex)) {
      return NextResponse.json({ error: "Invalid sex type" }, { status: 400 });
    }

    // Parse timestamp
    const timestampDate = new Date(timestamp);
    if (isNaN(timestampDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid timestamp format" },
        { status: 400 }
      );
    }

    // Create the orgasm
    const orgasm = await prisma.orgasm.create({
      data: {
        userId: session.user.id,
        timestamp: timestampDate,
        type,
        sex,
        note: note || null,
      },
    });

    return NextResponse.json({ success: true, orgasm }, { status: 201 });
  } catch (error) {
    console.error("Error creating orgasm:", error);
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
    const { id, timestamp, type, sex, note } = body;

    // Validate input
    if (!id || !timestamp || !type || !sex) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate enum values
    if (!Object.values(OrgasmType).includes(type)) {
      return NextResponse.json(
        { error: "Invalid orgasm type" },
        { status: 400 }
      );
    }

    if (!Object.values(SexType).includes(sex)) {
      return NextResponse.json({ error: "Invalid sex type" }, { status: 400 });
    }

    // Verify the orgasm belongs to the user
    const existingOrgasm = await prisma.orgasm.findUnique({
      where: { id },
    });

    if (!existingOrgasm) {
      return NextResponse.json({ error: "Orgasm not found" }, { status: 404 });
    }

    if (existingOrgasm.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse timestamp
    const timestampDate = new Date(timestamp);
    if (isNaN(timestampDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid timestamp format" },
        { status: 400 }
      );
    }

    // Update the orgasm
    const orgasm = await prisma.orgasm.update({
      where: { id },
      data: {
        timestamp: timestampDate,
        type,
        sex,
        note: note || null,
      },
    });

    return NextResponse.json({ success: true, orgasm }, { status: 200 });
  } catch (error) {
    console.error("Error updating orgasm:", error);
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
      return NextResponse.json({ error: "Missing orgasm ID" }, { status: 400 });
    }

    // Verify the orgasm belongs to the user
    const existingOrgasm = await prisma.orgasm.findUnique({
      where: { id },
    });

    if (!existingOrgasm) {
      return NextResponse.json({ error: "Orgasm not found" }, { status: 404 });
    }

    if (existingOrgasm.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the orgasm
    await prisma.orgasm.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting orgasm:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
