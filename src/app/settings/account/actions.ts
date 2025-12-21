"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { revalidatePath } from "next/cache";

export async function checkUsername(username: string): Promise<boolean> {
  if (!username || username.length < 3) {
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

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      username: username && username.length < 3 ? undefined : username,
      publicProfile: username && username.length < 3 ? false : publicProfile,
      publicOrgasms:
        username && publicProfile && username.length < 3
          ? false
          : publicOrgasms,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/users");
}
