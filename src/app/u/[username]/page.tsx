import { Suspense } from "react";
import UserProfile from "./UserProfile";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  return (
    <div className="container flex flex-col items-center gap-6 px-4 py-4 md:py-8">
      <div className="w-full">
        <Suspense fallback={<div className="text-white">Loading...</div>}>
          <UserProfile username={username} />
        </Suspense>
      </div>
    </div>
  );
}
