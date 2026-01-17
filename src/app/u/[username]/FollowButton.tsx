"use client";

import { useState, useTransition } from "react";
import { followUser, unfollowUser } from "./actions";
import { useRouter } from "next/navigation";

export default function FollowButton({
  username,
  isFollowing: initialIsFollowing,
}: {
  username: string;
  isFollowing: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    startTransition(async () => {
      try {
        if (isFollowing) {
          await unfollowUser(username);
          setIsFollowing(false);
        } else {
          await followUser(username);
          setIsFollowing(true);
        }
        router.refresh();
      } catch (error) {
        console.error("Error toggling follow:", error);
        // Revert on error
        setIsFollowing(initialIsFollowing);
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
        isFollowing
          ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
          : "bg-pink-500 dark:bg-pink-600 text-white hover:bg-pink-600 dark:hover:bg-pink-700"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isPending ? "..." : isFollowing ? "Unfollow" : "Follow"}
    </button>
  );
}
