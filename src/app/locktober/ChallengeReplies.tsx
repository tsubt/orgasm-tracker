"use client";

import { RelativeTime } from "@/app/components/SubjectTime";
import type { SerializedComment } from "@/lib/locktober/load";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { addComment, deleteComment, toggleLike } from "./actions";

const inputClass =
  "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100";
const buttonClass =
  "rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white hover:bg-pink-600 disabled:opacity-50";

export default function ChallengeReplies({
  slug,
  likeCount,
  liked,
  comments,
  viewerId,
  isOwner,
  serverNow,
}: {
  slug: string;
  likeCount: number;
  liked: boolean;
  comments: SerializedComment[];
  viewerId: string | null;
  isOwner: boolean;
  serverNow: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setPending(true);
    try {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setBody("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={buttonClass}
          disabled={!viewerId || pending}
          onClick={() => void run(() => toggleLike(slug))}
        >
          {liked ? "Unlike" : "Like"} · {likeCount}
        </button>
        {!viewerId && (
          <span className="text-sm text-gray-500">Sign in to like or comment.</span>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Comments</h2>
        {comments.length === 0 && (
          <p className="text-sm text-gray-500">No comments yet.</p>
        )}
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                <span>
                  {comment.username ? `@${comment.username}` : comment.name || "Someone"}
                  {" · "}
                  <RelativeTime at={comment.createdAt} serverNow={serverNow} />
                </span>
                {viewerId && (comment.userId === viewerId || isOwner) && (
                  <button
                    type="button"
                    className="underline"
                    disabled={pending}
                    onClick={() => void run(() => deleteComment(comment.id))}
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
        {viewerId && (
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void run(() => addComment(slug, body));
            }}
          >
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Say something"
              className={inputClass}
            />
            <button type="submit" className={buttonClass} disabled={pending || !body.trim()}>
              Comment
            </button>
          </form>
        )}
      </section>
    </>
  );
}
