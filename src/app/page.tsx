import { auth } from "@/auth";
import Guest from "./components/Guest";
import StatsContent from "./components/StatsContent";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const time = (await searchParams).time ?? "All";

  if (session && session.user && session.user.id) {
    return (
      <main className="w-full p-4 md:p-8">
        <div className="max-w-4xl">
          <StatsContent
            userId={session.user.id}
            time={typeof time === "string" ? time : "All"}
            tz="UTC"
          />
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-12 border border-gray-200 dark:border-gray-800 text-center">
        <Guest />
      </div>
    </main>
  );
}
