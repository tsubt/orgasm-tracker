import { auth } from "@/auth";
import Guest from "./components/Guest";
import StatsContent from "./components/StatsContent";
import Orgasm from "./components/Orgasm";
import Link from "next/link";

const navItems = [
  { name: "Dashboard", href: "/", icon: "📊" },
  { name: "Orgasms", href: "/orgasms", icon: "📝" },
  { name: "Stats", href: "/stats", icon: "📈" },
  { name: "Users", href: "/users", icon: "👥" },
  { name: "Settings", href: "/settings", icon: "⚙️" },
];

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
      <main className="w-full h-[calc(100vh-200px)] flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-950">
        {/* Left Sidebar - Industrial Design (light in light mode, dark in dark mode) */}
        <div className="lg:w-64 bg-gray-100 dark:bg-gray-900 border-r-4 border-pink-500 flex flex-col">
          {/* User Info Section */}
          <div className="p-5 border-b-2 border-gray-300 dark:border-gray-800">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-1">
              {session.user.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-500 text-xs uppercase tracking-widest">
              Track your journey
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href} icon={item.icon}>
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Primary Action */}
          <div className="p-4 border-t-2 border-gray-300 dark:border-gray-800">
            <Orgasm />
          </div>
        </div>

        {/* Right Side - Main Content (adapts to light/dark mode) */}
        <div className="flex-1 bg-white dark:bg-gray-900 p-8 overflow-y-auto">
          <div className="max-w-4xl">
            <StatsContent
              userId={session.user.id}
              time={typeof time === "string" ? time : "All"}
              tz={typeof tz === "string" ? tz : "UTC"}
              period={typeof period === "string" ? period : "Year"}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-12 border border-gray-200 dark:border-gray-800 text-center">
        <Guest />
      </div>
    </main>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 border-l-4 border-transparent text-gray-600 dark:text-gray-400 hover:border-pink-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-pink-500 transition-all uppercase text-xs font-bold tracking-wider"
    >
      <span className="text-base">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
