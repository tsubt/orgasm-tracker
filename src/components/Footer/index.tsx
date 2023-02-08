import Link from "next/link";
import { SocialIcon } from "react-social-icons";

const social = [
  {
    title: "GitHub",
    href: "https://github.com/tsubt/orgasm-tracker",
  },
];

export default function Footer() {
  return (
    <footer className="flex items-center justify-center bg-black p-2 pb-12 font-bold text-white md:p-4 md:pb-16">
      <div className="container mx-auto flex flex-col justify-between gap-4 px-2 md:flex-row">
        <div className="flex flex-col gap-1">
          <div className="text-pink-700">OrgasmTracker &copy; 2023</div>
          <div className="text-xs">
            By{" "}
            <Link
              href="https://twitter.com/thesubtop"
              className="text-blue-400"
            >
              @thesubtop
            </Link>
          </div>
        </div>
        <div className="flex flex-row gap-2">
          {social.map((item) => (
            <SocialIcon
              key={item.title}
              url={item.href}
              style={{ height: 25, width: 25 }}
              bgColor="#fbcfe8"
            />
          ))}
        </div>
      </div>
    </footer>
  );
}
