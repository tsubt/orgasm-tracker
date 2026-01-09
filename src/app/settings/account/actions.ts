"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { revalidatePath } from "next/cache";

// Validate that username contains only alphanumeric characters, underscores, and dots
function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_.]+$/.test(username);
}

export async function checkUsername(username: string): Promise<boolean> {
  if (!username || username.length < 3) {
    return false;
  }
  if (!isValidUsername(username)) {
    return false;
  }
  const count = await prisma.user.count({
    where: {
      username,
    },
  });
  return count === 0;
}

const VALID_CHART_NAMES = ["Line", "Frequency", "Calendar", "Week", "Radial", "Timeline"];

export async function updateSettings(data: {
  username: string;
  publicProfile: boolean;
  publicOrgasms: boolean;
  trackChastityStatus?: boolean;
  firstDayOfWeek?: number;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const { username, publicProfile, publicOrgasms, trackChastityStatus, firstDayOfWeek } = data;

  // Validate username format before saving
  const isValid =
    !username || (username.length >= 3 && isValidUsername(username));

  // If disabling chastity tracking, check for active session
  if (trackChastityStatus === false) {
    const activeSession = await prisma.chastitySession.findFirst({
      where: {
        userId: session.user.id,
        endTime: null,
      },
    });

    if (activeSession) {
      throw new Error(
        "Cannot disable chastity tracking while there is an active session. Please end the session first."
      );
    }
  }

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      username: isValid ? username : undefined,
      publicProfile: isValid ? publicProfile : false,
      publicOrgasms: isValid && publicProfile ? publicOrgasms : false,
      trackChastityStatus:
        trackChastityStatus !== undefined ? trackChastityStatus : undefined,
      firstDayOfWeek:
        firstDayOfWeek !== undefined ? firstDayOfWeek : undefined,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/users");
  revalidatePath(`/u/${username}`);
  revalidatePath("/");
}

export async function deleteAccount() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Delete the user - this will cascade delete all related data
  // (orgasms, accounts, sessions) due to onDelete: Cascade in schema
  await prisma.user.delete({
    where: {
      id: session.user.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/users");
}
