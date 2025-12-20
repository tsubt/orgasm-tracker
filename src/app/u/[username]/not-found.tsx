import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
      <h2 className="text-lg font-bold uppercase tracking-wider text-white">
        User Not Found
      </h2>

      <div className="flex flex-col gap-4 text-white text-center">
        <p>
          The user you&apos;re looking for doesn&apos;t exist, doesn&apos;t have
          a public profile, or has no orgasms to show.
        </p>
        <Link
          href="/users"
          className="text-pink-200 hover:text-pink-100 underline"
        >
          Browse public users
        </Link>
      </div>
    </div>
  );
}
