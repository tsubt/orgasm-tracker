"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SettingsNav({
  pages,
}: {
  pages: { name: string; href: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2">
      {pages.map((page) => {
        const isActive = pathname === page.href;
        return (
          <Link
            key={page.href}
            href={page.href}
            className={`rounded-md px-4 py-2.5 text-white transition-all ${
              isActive
                ? "bg-pink-300/40 font-semibold shadow-md"
                : "bg-pink-200/20 hover:bg-pink-200/30 hover:shadow-sm"
            }`}
          >
            {page.name}
          </Link>
        );
      })}
    </nav>
  );
}
