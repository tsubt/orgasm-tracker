"use client";

import { useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import Sidebar from "./Sidebar";
import { Session } from "next-auth";

export default function SidebarWrapper({
  session,
  username,
}: {
  session: Session | null;
  username: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-100 dark:bg-gray-900 border-b-4 border-pink-500">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wide">
            OrgasmTracker
          </h1>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Mobile as drawer, Desktop as sidebar */}
      <div
        className={`lg:relative fixed top-0 left-0 z-40 h-full transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="lg:w-64 w-64 bg-gray-100 dark:bg-gray-900 border-r-4 border-pink-500 flex flex-col min-h-screen lg:min-h-screen h-screen lg:h-auto">
          <Sidebar
            session={session}
            username={username}
            onMobileNavClick={() => setIsOpen(false)}
          />
        </div>
      </div>
    </>
  );
}
