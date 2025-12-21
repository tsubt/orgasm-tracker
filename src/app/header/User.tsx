import { auth } from "@/auth";
import SignIn from "@/components/signIn";
import { prisma } from "@/prisma";
import type { Session } from "next-auth";
import Image from "next/image";
import Link from "next/link";
// import { signIn, useSession } from "next-auth/react";
// import Image from "next/image";
// import Link from "next/link";
// import { trpc } from "../../utils/trpc";

export default async function User() {
  const session = await auth();

  return (
    <>
      {session ? (
        <UserMenu session={session} />
      ) : (
        <div className="mx-8">
          <SignIn />
        </div>
      )}
    </>
  );
}

async function UserMenu({ session }: { session: Session }) {
  if (!session || !session.user) return <></>;

  const userInfo = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  const userId = userInfo ? userInfo.username : "";

  const items: { name: string; href: string; show?: boolean }[] = [
    { name: "Your profile", href: "/u/" + userId, show: userId !== "" },
    { name: "Orgasms", href: "/orgasms" },
    { name: "Settings", href: "/settings/account" },
    { name: "Sign out", href: "/api/auth/signout" },
  ];

  return (
    <div className="group relative flex flex-col items-center justify-center  gap-4 md:flex-row-reverse md:px-8">
      <div className="relative h-6 w-6 md:h-10 md:w-10 md:cursor-pointer">
        <Image
          src={session.user?.image ?? "/avatar-placeholder.jpg"}
          alt="User image"
          fill={true}
          className="rounded object-cover"
        />
      </div>
      <div className="ml-2 text-sm font-medium text-gray-900 dark:text-white md:text-base">
        {session.user?.name}
      </div>

      <div className="flex flex-col gap-2 group-hover:flex md:absolute md:top-full md:hidden md:w-full md:rounded-lg md:bg-gray-800 dark:md:bg-gray-950 md:py-8">
        {items
          .filter((item) => item.show !== false)
          .map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="py-1 text-gray-900 dark:text-white hover:text-pink-500 dark:hover:text-pink-400 md:px-8"
            >
              {item.name}
            </Link>
          ))}
      </div>
    </div>
  );
}
