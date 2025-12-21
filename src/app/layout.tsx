import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import Header from "./header";
import Footer from "./components/Footer";
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
    <html lang="en">
      <body
        className={`${quicksand.variable}  antialiased flex min-h-screen h-full flex-col justify-center bg-linear-to-b from-pink-700 to-pink-900`}
      >
        <Header />
        <div className="flex flex-1 flex-col items-center">{children}</div>
        <Footer />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
