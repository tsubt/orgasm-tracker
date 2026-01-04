import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ChastityPageContent from "./ChastityPageContent";

export default async function ChastityPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="w-full p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8 h-full">
        <ChastityPageContent />
      </div>
    </div>
  );
}
