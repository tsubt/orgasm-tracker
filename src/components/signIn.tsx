"use client";

import { signInWithGoogle } from "@/app/actions/auth";

export default function SignIn() {
  return (
    <form action={signInWithGoogle} className="w-full">
      <button
        type="submit"
        className="w-full flex items-center gap-3 px-3 py-2.5 border-l-4 border-transparent transition-all uppercase text-xs font-bold tracking-wider text-gray-600 dark:text-gray-400 hover:border-pink-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-pink-500 cursor-pointer"
      >
        <span className="text-base">🔒</span>
        <span>Sign in</span>
      </button>
    </form>
  );
}
