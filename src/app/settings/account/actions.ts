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

export async function updateSettings(data: {
  username: string;
  publicProfile: boolean;
  publicOrgasms: boolean;
}) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const { username, publicProfile, publicOrgasms } = data;

  // Validate username format before saving
  const isValid = !username || (username.length >= 3 && isValidUsername(username));

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      username: isValid ? username : undefined,
      publicProfile: isValid ? publicProfile : false,
      publicOrgasms:
        isValid && publicProfile ? publicOrgasms : false,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/users");
}
