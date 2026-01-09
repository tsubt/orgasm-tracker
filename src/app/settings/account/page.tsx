import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/prisma";
import AccountSettingsForm from "./AccountSettingsForm";

export default async function AccountSettingsPage() {
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
      trackChastityStatus: true,
      firstDayOfWeek: true,
    },
  });

  return (
    <div className="w-full max-w-3xl">
      <AccountSettingsForm
        initialUsername={userSettings?.username || ""}
        initialPublicProfile={userSettings?.publicProfile || false}
        initialPublicOrgasms={userSettings?.publicOrgasms || false}
        initialTrackChastityStatus={userSettings?.trackChastityStatus || false}
        initialFirstDayOfWeek={userSettings?.firstDayOfWeek ?? 1}
      />
    </div>
  );
}
