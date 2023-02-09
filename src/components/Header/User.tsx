import { LockClosedIcon } from "@heroicons/react/24/solid";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { trpc } from "../../utils/trpc";

export default function User() {
  const { data: session, status: authStatus } = useSession();

  return (
    <>
      {authStatus === "authenticated" ? (
        <UserMenu session={session} />
      ) : authStatus === "loading" ? (
        ""
      ) : (
        <div className="mx-8">
          <Link
            href="/api/auth/signin"
            className="flex flex-row items-center gap-2 text-white hover:text-pink-200"
          >
            <LockClosedIcon className="h-6 w-6" />
            Sign in
          </Link>
        </div>
      )}
    </>
  );
}

const UserMenu = ({ session }: { session: Session }) => {
  if (!session) return <></>;

  const { data: userInfo } = trpc.users.self.useQuery();
  const userId = userInfo ? userInfo.username : "";

  const items = [
    { name: "Your profile", href: "/u/" + userId, show: userId !== "" },
    { name: "Settings", href: "/settings/account" },
    { name: "Sign out", href: "/api/auth/signout" },
  ];

  return (
    <div className="group relative flex flex-col items-center justify-center  gap-4 md:flex-row-reverse md:px-8">
      <div className="relative h-6 w-6 md:h-10 md:w-10 md:cursor-pointer">
        <Image
          src={session.user?.image || "/avatar-placeholder.jpg"}
          alt="User image"
          fill={true}
          className="rounded-full"
        />
      </div>
      <div className="ml-2 text-sm font-medium text-white md:text-base">
        {session.user?.name}
      </div>

      <div className="flex flex-col gap-2 group-hover:flex md:absolute md:top-full md:hidden md:w-full md:rounded-lg md:bg-black md:py-8">
        {items
          .filter((item) => item.show !== false)
          .map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="py-1 text-white hover:text-pink-300 md:px-8"
            >
              {item.name}
            </Link>
          ))}
      </div>
    </div>
  );
};
