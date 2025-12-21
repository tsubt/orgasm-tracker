import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/prisma";
import AccountSettingsForm from "./account/AccountSettingsForm";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const userSettings = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      username: true,
      publicProfile: true,
      publicOrgasms: true,
    },
  });

  return (
    <div className="w-full p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 dark:text-white">
          Settings
        </h2>
        <AccountSettingsForm
          initialUsername={userSettings?.username || ""}
          initialPublicProfile={userSettings?.publicProfile || false}
          initialPublicOrgasms={userSettings?.publicOrgasms || false}
        />
      </div>
    </div>
  );
}
