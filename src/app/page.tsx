import { auth } from "@/auth";
import Guest from "./components/Guest";
import Stats from "./components/Stats";
import Orgasm from "./components/Orgasm";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const time = (await searchParams).time ?? "All";
  const tz = (await searchParams).tz ?? "UTC";
  const period = (await searchParams).period ?? "Year";

  if (session && session.user) {
    return (
      <main className="grid grid-cols-1 lg:grid-cols-4 gap-4 w-full">
        <div className="col-start-4 flex justify-end">
          <Orgasm />
        </div>

        <div className="col-span-3">
          <Stats
            session={session}
            time={typeof time === "string" ? time : "All"}
            tz={typeof tz === "string" ? tz : "UTC"}
            period={typeof period === "string" ? period : "Year"}
          />
        </div>
      </main>
    );
  }

  return (
    <main>
      <Guest />
    </main>
  );
}
