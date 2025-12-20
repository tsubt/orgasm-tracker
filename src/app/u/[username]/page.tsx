import { Suspense } from "react";
import UserProfile from "./UserProfile";

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { username } = await params;
  const period = (await searchParams).period ?? "Year";

  return (
    <div className="container flex flex-col items-center gap-12 px-4 py-16">
      <h2 className="text-lg font-bold uppercase tracking-wider text-white">
        {username}&apos;s Orgasm Dashboard
      </h2>

      <div className="w-full text-center text-white">
        <Suspense fallback={<div>Loading...</div>}>
          <UserProfile
            username={username}
            period={typeof period === "string" ? period : "Year"}
          />
        </Suspense>
      </div>
    </div>
  );
}
