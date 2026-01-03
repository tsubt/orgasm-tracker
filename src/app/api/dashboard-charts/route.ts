import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

const VALID_CHART_NAMES = ["Line", "Frequency", "Calendar", "Week", "Radial", "Timeline"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const charts = await prisma.dashboardChart.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        chartPosition: "asc",
      },
    });

    return NextResponse.json({ charts }, { status: 200 });
  } catch (error) {
    console.error("Error fetching dashboard charts:", error);
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
    const { chartName } = body;

    // Validate input
    if (!chartName) {
      return NextResponse.json(
        { error: "Missing chartName" },
        { status: 400 }
      );
    }

    if (!VALID_CHART_NAMES.includes(chartName)) {
      return NextResponse.json(
        { error: "Invalid chart name" },
        { status: 400 }
      );
    }

    // Get the next position (highest position + 1, or 0 if no charts exist)
    const existingCharts = await prisma.dashboardChart.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        chartPosition: "desc",
      },
      take: 1,
    });

    const nextPosition = existingCharts.length > 0
      ? existingCharts[0].chartPosition + 1
      : 0;

    // Create the chart
    const chart = await prisma.dashboardChart.create({
      data: {
        userId: session.user.id,
        chartName,
        chartPosition: nextPosition,
      },
    });

    return NextResponse.json({ success: true, chart }, { status: 201 });
  } catch (error) {
    console.error("Error creating dashboard chart:", error);
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
    const { id, chartName } = body;

    // Validate input
    if (!id || !chartName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!VALID_CHART_NAMES.includes(chartName)) {
      return NextResponse.json(
        { error: "Invalid chart name" },
        { status: 400 }
      );
    }

    // Verify the chart belongs to the user
    const existingChart = await prisma.dashboardChart.findUnique({
      where: { id },
    });

    if (!existingChart) {
      return NextResponse.json({ error: "Chart not found" }, { status: 404 });
    }

    if (existingChart.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update the chart
    const chart = await prisma.dashboardChart.update({
      where: { id },
      data: {
        chartName,
      },
    });

    return NextResponse.json({ success: true, chart }, { status: 200 });
  } catch (error) {
    console.error("Error updating dashboard chart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

