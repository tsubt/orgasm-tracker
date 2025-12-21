import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { Toaster } from "react-hot-toast";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OrgasmTracker",
  description: "Keep track of your pleasure",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${quicksand.variable} antialiased flex min-h-screen h-full flex-col bg-linear-to-b from-pink-700 to-pink-900`}
      >
        <div className="flex flex-1 flex-col lg:flex-row w-full min-h-screen bg-gray-50 dark:bg-gray-950">
          <Sidebar />
          <div className="flex-1 bg-white dark:bg-gray-900 overflow-y-auto">
            {children}
          </div>
        </div>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
