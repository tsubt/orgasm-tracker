import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

const VALID_CHART_NAMES = ["Line", "Frequency", "Calendar", "Week", "Radial", "Timeline"];

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { defaultProfileChart } = body;

    // Validate input
    if (defaultProfileChart !== null && !VALID_CHART_NAMES.includes(defaultProfileChart)) {
      return NextResponse.json(
        { error: "Invalid chart name" },
        { status: 400 }
      );
    }

    // Update the user's default profile chart
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        defaultProfileChart: defaultProfileChart || null,
      },
    });

    return NextResponse.json({ success: true, defaultProfileChart: user.defaultProfileChart }, { status: 200 });
  } catch (error) {
    console.error("Error updating default profile chart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
