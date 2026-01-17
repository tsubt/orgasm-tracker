"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";
import { followUser, unfollowUser } from "@/app/u/[username]/actions";
import type { Orgasm, User, ChastitySession } from "@prisma/client";

dayjs.extend(relativeTime);
dayjs.extend(duration);

export default function UserCard({
  user,
  currentUserId,
  isFollowing: initialIsFollowing,
}: {
  user: User & {
    orgasms: Orgasm[];
    chastitySessions?: ChastitySession[];
  };
  currentUserId?: string;
  isFollowing?: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? false);
  const [isPending, startTransition] = useTransition();
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  const showFollowButton = currentUserId && currentUserId !== user.id;
  const isOwnProfile = currentUserId === user.id;
  // Get the last orgasm - use timestamp (date/time fields are deprecated)
  const orgasms = user.orgasms
    .filter((o) => o.timestamp !== null)
    .map((o) => ({
      ...o,
      datetime: dayjs(o.timestamp),
    }))
    .sort((x, y) => {
      return x.datetime.isAfter(y.datetime) ? -1 : 1;
    });

  const lastOrgasm = orgasms[0];

  // Check for active chastity session
  const activeSession =
    user.trackChastityStatus && user.chastitySessions
      ? user.chastitySessions.find((s) => s.endTime === null)
      : null;

  const lockedDuration = activeSession
    ? dayjs.duration(dayjs().diff(dayjs(activeSession.startTime)))
    : null;

  const handleFollowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user.username) return;

    startTransition(async () => {
      try {
        if (isFollowing) {
          await unfollowUser(user.username!);
          setIsFollowing(false);
        } else {
          await followUser(user.username!);
          setIsFollowing(true);
        }
        router.refresh();
      } catch (error) {
        console.error("Error toggling follow:", error);
        // Revert on error
        setIsFollowing(initialIsFollowing ?? false);
      }
    });
  };

  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 p-4 md:p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <Link
        href={"/u/" + user.username}
        className="block"
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
        {/* Main content */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="text-lg md:text-xl font-semibold text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 transition-colors">
            @{user.username}
          </div>

          {/* Orgasm stats */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-gray-700 dark:text-gray-300">
            {orgasms.length ? (
              <>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-base">{orgasms.length}</span>
                  <span>orgasm{orgasms.length > 1 ? "s" : ""} tracked</span>
                </div>
                {lastOrgasm && (
                  <>
                    <span className="hidden sm:inline text-gray-400 dark:text-gray-500">•</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Last orgasm {lastOrgasm.datetime.fromNow()}
                    </span>
                    {activeSession && lockedDuration && (
                      <>
                        <span className="hidden sm:inline text-gray-400 dark:text-gray-500">•</span>
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                          Locked for {lockedDuration.humanize()}
                        </span>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">No orgasms tracked</span>
            )}
          </div>
        </div>

          {/* Metadata - right side on desktop, below on mobile */}
          <div className="flex flex-col md:items-end gap-1 text-xs text-gray-600 dark:text-gray-400 md:ml-4 md:flex-shrink-0">
            {showFollowButton && (
              <button
                onClick={handleFollowClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={isPending}
                className={`mb-2 px-3 py-1.5 rounded-md font-medium text-sm transition-colors ${
                  isFollowing
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-red-500 dark:hover:bg-red-600 hover:text-white"
                    : "bg-pink-500 dark:bg-pink-600 text-white hover:bg-pink-600 dark:hover:bg-pink-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isPending
                  ? "..."
                  : isFollowing
                  ? isHovered
                    ? "Unfollow"
                    : "Following"
                  : "Follow"}
              </button>
            )}
            <div className="flex md:flex-col gap-2 md:gap-1">
              <div>
                <span className="text-gray-500 dark:text-gray-500 md:hidden">Joined: </span>
                {dayjs(user.joinedAt).format("DD MMM YYYY")}
              </div>
              <div className="md:border-t md:border-gray-200 md:dark:border-gray-700 md:pt-1 md:mt-1">
                <span className="text-gray-500 dark:text-gray-500 md:hidden">Last seen: </span>
                {dayjs(user.lastSeen).fromNow()}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
