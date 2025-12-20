import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";
import SettingsNav from "./SettingsNav";

const settingsPages = [
  { name: "Account", href: "/settings/account" },
  // Add more settings pages here in the future
];

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
      <h2 className="text-lg font-bold uppercase tracking-wider text-white">
        Settings
      </h2>

      <div className="flex w-full max-w-6xl gap-6">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 rounded-lg bg-black/20 p-4">
          <SettingsNav pages={settingsPages} />
        </aside>

        {/* Main content */}
        <main className="flex-1 rounded-lg bg-black/10 p-6">{children}</main>
      </div>
    </div>
  );
}
