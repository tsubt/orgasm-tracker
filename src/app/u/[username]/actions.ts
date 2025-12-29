"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { revalidatePath } from "next/cache";

export async function updateBio(bio: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Limit bio to 160 characters
  const trimmedBio = bio.trim().slice(0, 160);

  const user = await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      bio: trimmedBio || null,
    },
    select: {
      username: true,
    },
  });

  // Revalidate the profile page using the username
  if (user.username) {
    revalidatePath(`/u/${user.username}`);
  }
}
