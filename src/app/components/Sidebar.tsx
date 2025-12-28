import SignIn from "@/components/signIn";
import Orgasm from "./Orgasm";
import Footer from "./Footer";
import Image from "next/image";
import NavLink from "./NavLink";
import { Session } from "next-auth";

const navItems = [
  { name: "Dashboard", href: "/", icon: "📊" },
  { name: "Orgasms", href: "/orgasms", icon: "📝" },
  { name: "Stats", href: "/stats", icon: "📈" },
  { name: "Users", href: "/users", icon: "👥" },
  { name: "Settings", href: "/settings", icon: "⚙️" },
];

export default function Sidebar({
  session,
  username,
  onMobileNavClick,
}: {
  session: Session | null;
  username: string | null;
  onMobileNavClick?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {session && session.user ? (
        <>
          {/* User Info Section */}
          <div className="p-5 border-b-2 border-gray-300 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="relative h-10 w-10 flex-shrink-0">
                <Image
                  src={session.user.image ?? "/avatar-placeholder.jpg"}
                  alt="User image"
                  fill={true}
                  className="rounded object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wide truncate">
                  {session.user.name}
                </h1>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-500 text-xs uppercase tracking-widest mt-1">
              Track your journey
            </p>
          </div>

          {/* Primary Action */}
          <div className="p-4 border-b-2 border-gray-300 dark:border-gray-800 flex-shrink-0">
            <Orgasm />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto min-h-0">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                onClick={onMobileNavClick}
              >
                {item.name}
              </NavLink>
            ))}

            {/* User Menu Items */}
            <UserMenuItems
              session={session}
              username={username}
              onMobileNavClick={onMobileNavClick}
            />
          </nav>

          {/* Footer */}
          <div className="border-t-2 border-gray-300 dark:border-gray-800 flex-shrink-0 mt-auto">
            <Footer />
          </div>
        </>
      ) : (
        <>
          {/* Guest Section */}
          <div className="p-5 border-b-2 border-gray-300 dark:border-gray-800 flex-shrink-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-1">
              OrgasmTracker
            </h1>
            <p className="text-gray-600 dark:text-gray-500 text-xs uppercase tracking-widest">
              Sign in to continue
            </p>
          </div>

          {/* Sign In Section */}
          <div className="flex-1 p-5 flex items-center justify-center overflow-y-auto min-h-0">
            <div className="flex flex-col items-center gap-4">
              <p className="text-gray-900 dark:text-white text-center">
                Please sign in to access your dashboard
              </p>
              <div className="flex items-center justify-center">
                <SignIn />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-gray-300 dark:border-gray-800 flex-shrink-0 mt-auto">
            <Footer />
          </div>
        </>
      )}
    </div>
  );
}

function UserMenuItems({
  session,
  username,
  onMobileNavClick,
}: {
  session: Session;
  username: string | null;
  onMobileNavClick?: () => void;
}) {
  if (!session || !session.user) return null;

  const userItems: {
    name: string;
    href: string;
    show?: boolean;
    icon: string;
  }[] = [
    {
      name: "Your profile",
      href: "/u/" + username,
      show: username !== null && username !== "",
      icon: "👤",
    },
    { name: "Sign out", href: "/api/auth/signout", icon: "🚪" },
  ];

  return (
    <>
      <div className="pt-2 mt-2 border-t border-gray-300 dark:border-gray-800">
        {userItems
          .filter((item) => item.show !== false)
          .map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              onClick={onMobileNavClick}
            >
              {item.name}
            </NavLink>
          ))}
      </div>
    </>
  );
}
