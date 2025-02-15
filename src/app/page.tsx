import { auth } from "@/auth";
import Guest from "./components/Guest";
import Stats from "./components/Stats";

export default async function Home() {
  const session = await auth();

  if (session && session.user) {
    return (
      <main>
        <Stats session={session} />
      </main>
    );
  }

  return (
    <main>
      <Guest />
    </main>
  );
}
