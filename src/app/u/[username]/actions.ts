"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { revalidatePath } from "next/cache";

export async function updateBio(bio: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const currentUserId = session.user.id;

  // Limit bio to 160 characters
  const trimmedBio = bio.trim().slice(0, 160);

  const user = await prisma.user.update({
    where: {
      id: currentUserId,
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

export async function followUser(username: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const currentUserId = session.user.id;

  // Get the user to follow
  const userToFollow = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!userToFollow) {
    throw new Error("User not found");
  }

  // Prevent self-following
  if (userToFollow.id === currentUserId) {
    throw new Error("Cannot follow yourself");
  }

  // Create follow relationship
  await prisma.follow.create({
    data: {
      followerId: currentUserId,
      followingId: userToFollow.id,
    },
  });

  // Revalidate relevant paths
  revalidatePath(`/u/${username}`);
  revalidatePath(`/u/${username}/followers`);
  revalidatePath(`/u/${username}/following`);
  revalidatePath(`/users`);
}

export async function unfollowUser(username: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const currentUserId = session.user.id;

  // Get the user to unfollow
  const userToUnfollow = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!userToUnfollow) {
    throw new Error("User not found");
  }

  // Delete follow relationship
  await prisma.follow.deleteMany({
    where: {
      followerId: currentUserId,
      followingId: userToUnfollow.id,
    },
  });

  // Revalidate relevant paths
  revalidatePath(`/u/${username}`);
  revalidatePath(`/u/${username}/followers`);
  revalidatePath(`/u/${username}/following`);
  revalidatePath(`/users`);
}
