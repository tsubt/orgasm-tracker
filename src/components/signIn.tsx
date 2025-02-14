import { signIn } from "@/auth";

import { LockClosedIcon, LockOpenIcon } from "@heroicons/react/24/solid";

export default function SignIn() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google");
      }}
    >
      <button
        type="submit"
        className="group flex flex-row items-center gap-2 text-white cursor-pointer"
      >
        <LockClosedIcon className="h-6 w-6 group-hover:hidden" />
        <LockOpenIcon className="hidden h-6 w-6 group-hover:block" />
        Sign in
      </button>
    </form>
  );
}
