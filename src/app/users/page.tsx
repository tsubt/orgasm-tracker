import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import UsersList from "./UsersList";
import GlobalStats from "./GlobalStats";

export default async function UsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }
  return (
    <div className="w-full p-4 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 dark:text-white">
          Public Users
        </h2>

        <div className="flex justify-center gap-8 text-center text-gray-900 dark:text-white">
          <Suspense
            fallback={
              <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            }
          >
            <GlobalStats />
          </Suspense>
        </div>

        <UsersList />
      </div>
    </div>
  );
}
