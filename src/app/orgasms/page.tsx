import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OrgasmsTable from "./OrgasmsTable";

export default async function OrgasmsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-6xl">
      <h2 className="text-2xl font-bold uppercase tracking-wider text-white">
        Manage your Orgasms
      </h2>
      <OrgasmsTable />
    </div>
  );
}
