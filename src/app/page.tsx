import { auth } from "@/auth";
import Guest from "./components/Guest";
import Stats from "./components/Stats";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const time = (await searchParams).time ?? "All";
  const tz = (await searchParams).tz ?? "UTC";

  if (session && session.user) {
    return (
      <main>
        <Stats
          session={session}
          time={typeof time === "string" ? time : "All"}
          tz={typeof tz === "string" ? tz : "UTC"}
        />
      </main>
    );
  }

  return (
    <main>
      <Guest />
    </main>
  );
}
