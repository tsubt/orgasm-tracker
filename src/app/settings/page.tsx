import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/prisma";
import AccountSettingsForm from "./account/AccountSettingsForm";
import DeleteAccount from "./account/DeleteAccount";

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
      trackChastityStatus: true,
      firstDayOfWeek: true,
    },
  });

  return (
    <div className="w-full p-4 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <h2 className="text-lg font-bold uppercase tracking-wider text-gray-900 dark:text-white">
          Settings
        </h2>
        <AccountSettingsForm
          initialUsername={userSettings?.username || ""}
          initialPublicProfile={userSettings?.publicProfile || false}
          initialPublicOrgasms={userSettings?.publicOrgasms || false}
          initialTrackChastityStatus={userSettings?.trackChastityStatus || false}
          initialFirstDayOfWeek={userSettings?.firstDayOfWeek ?? 1}
        />

        {/* Danger Zone */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-red-200 dark:border-red-900 p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-red-600 dark:text-red-500">
                Danger Zone
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Irreversible and destructive actions
              </p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Delete Account
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <div className="md:flex-shrink-0">
                <DeleteAccount />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
