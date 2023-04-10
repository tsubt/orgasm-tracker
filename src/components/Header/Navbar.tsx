import { Bars3Icon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import User from "./User";
import { useRouter } from "next/router";

const items = [
  { name: "About", href: "/about" },
  { name: "Users", href: "/users" },
  { name: "Stats", href: "/stats" },
];

// on small devices, the navbar is just a hamburger that opens a drawer
// on large devices, the navbar is a horizontal list of links
export default function Navbar() {
  const [open, setOpen] = useState(false);

  // close drawer when router changes
  const router = useRouter();
  useEffect(() => {
    const handleRouteChange = () => {
      setOpen(false);
    };
    router.events.on("routeChangeStart", handleRouteChange);
    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router.events]);

  return (
    <>
      <div className="flex">
        <div className="hidden items-center justify-center gap-8 md:flex">
          {items.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className=" uppercase tracking-wider text-white"
              onClick={() => setOpen(false)}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="hidden items-center justify-center gap-8 md:flex">
          <User />
        </div>
        <div className="flex items-center justify-center md:hidden">
          <Bars3Icon
            className="h-6 w-6 cursor-pointer"
            onClick={() => setOpen(true)}
          />
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { ease: "easeInOut" } }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 overflow-hidden bg-black bg-opacity-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0, transition: { ease: "easeInOut" } }}
              exit={{ x: "100%" }}
              className="absolute top-0 right-0 bottom-0 z-20 bg-black p-8"
            >
              <div className="flex h-full flex-col items-center gap-8">
                <User />
                <div className="flex flex-col items-center justify-center gap-4">
                  {items.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="text-lg font-bold uppercase tracking-wider text-white"
                      onClick={() => setOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
