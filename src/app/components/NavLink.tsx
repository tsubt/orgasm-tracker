"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function NavLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 border-l-4 border-transparent transition-all uppercase text-xs font-bold tracking-wider ${
        isActive
          ? "bg-gray-200 dark:bg-gray-800 text-pink-500"
          : "text-gray-600 dark:text-gray-400 hover:border-pink-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-pink-500"
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
