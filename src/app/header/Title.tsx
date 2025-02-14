import Link from "next/link";

export default function Title() {
  return (
    <div className="flex items-center gap-2">
      <Link href="/">
        <div className="text-xl font-bold tracking-tight text-pink-700 sm:text-3xl">
          OT
        </div>
      </Link>
    </div>
  );
}
