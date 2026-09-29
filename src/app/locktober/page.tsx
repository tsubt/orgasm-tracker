import { auth } from "@/auth";
import { loadOwnerLocktober } from "@/lib/locktober/load";
import { redirect } from "next/navigation";
import LocktoberApp from "./LocktoberApp";

export const metadata = {
  title: "Locktober · OrgasmTracker",
};

export default async function LocktoberPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const data = await loadOwnerLocktober(session.user.id, { lockDays: true });
  if (!data) redirect("/");

  return (
    <div className="w-full p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <LocktoberApp
          challenges={data.challenges}
          username={data.user.username}
          firstDayOfWeek={data.user.firstDayOfWeek}
          activeChastity={data.activeChastity}
        />
      </div>
    </div>
  );
}
