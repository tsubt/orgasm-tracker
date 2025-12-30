import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import SidebarWrapper from "./components/SidebarWrapper";
import { Toaster } from "react-hot-toast";
import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { OrgasmModalProvider } from "./contexts/OrgasmModalContext";
import Orgasm from "./components/Orgasm";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OrgasmTracker",
  description: "Keep track of your pleasure",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  // Fetch username if user is logged in
  let username: string | null = null;
  if (session?.user?.id) {
    const userInfo = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true },
    });
    username = userInfo?.username ?? null;
  }

  return (
    <html lang="en" className="h-full">
      <body
        className={`${quicksand.variable} antialiased flex min-h-screen h-full flex-col bg-linear-to-b from-pink-700 to-pink-900`}
      >
        <OrgasmModalProvider>
          <div className="flex flex-1 flex-col lg:flex-row w-full h-screen bg-gray-50 dark:bg-gray-950">
            <SidebarWrapper session={session} username={username} />
            <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-y-auto lg:ml-0 pt-16 lg:pt-0">
              {children}
            </div>
          </div>
          {/* Orgasm modal - always available for the plus button */}
          {session && <Orgasm hideButton={true} />}
          <Toaster position="top-center" />
        </OrgasmModalProvider>
      </body>
    </html>
  );
}
