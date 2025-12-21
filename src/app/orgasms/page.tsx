import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OrgasmsTable from "./OrgasmsTable";

export default async function OrgasmsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="w-full p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8 h-full">
        <h2 className="text-2xl font-bold uppercase tracking-wider text-gray-900 dark:text-white">
          Manage your Orgasms
        </h2>
        <div className="flex-1">
          <OrgasmsTable />
        </div>
      </div>
    </div>
  );
}
