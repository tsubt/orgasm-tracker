import { Suspense } from "react";
import UsersList from "./UsersList";

export default function UsersPage() {
  return (
    <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
      <h2 className="text-lg font-bold uppercase tracking-wider text-white">
        Public Users
      </h2>

      <div className="flex w-full max-w-4xl flex-col gap-4 text-black">
        <Suspense fallback={<div className="text-white">Loading users...</div>}>
          <UsersList />
        </Suspense>
      </div>
    </div>
  );
}
