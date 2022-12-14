import { type NextPage } from "next";
import Head from "next/head";
import { signIn, signOut, useSession } from "next-auth/react";

import { motion } from "framer-motion";

import { trpc } from "../utils/trpc";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

import OrgasmChart from "../components/OrgasmChart";
import { useRef, useState } from "react";

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>OrgasmTracker</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-pink-700 to-pink-900">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            Orgasm Tracker
          </h1>

          <div className="flex flex-col items-center gap-2">
            <AuthShowcase />
          </div>
          <div className="w-full text-lg">
            <OrgasmCount />
          </div>
        </div>
      </main>
    </>
  );
};

export default Home;

const AuthShowcase: React.FC = () => {
  const { data: sessionData } = useSession();

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {sessionData && <span>Logged in as {sessionData.user?.name}</span>}
      </p>
      <button
        className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
        onClick={sessionData ? () => signOut() : () => signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
};

const OrgasmCount: React.FC = () => {
  const { data: sessionData } = useSession();

  const { data: userOrgasms } = trpc.orgasms.getUserOrgasms.useQuery(
    undefined,
    { enabled: sessionData?.user !== undefined }
  );

  const [newOrgasm, setNewOrgasm] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const context = trpc.useContext();

  const { mutate: addUserOrgasm } = trpc.orgasms.addUserOrgasm.useMutation({
    onSuccess: async () => {
      await context.orgasms.getUserOrgasms.invalidate();
      setNewOrgasm(false);
    },
  });

  const addOrgasm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!sessionData) return;
    const today = dayjs.utc().local();
    const date = dateRef.current?.value || today.format("YYYY-MM-DD");
    const time = timeRef.current?.value || today.format("HH:mm");
    const note = noteRef.current?.value || null;

    addUserOrgasm({ date, time, note });
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4  text-white">
      <div className="w-full  text-center">
        {userOrgasms ? (
          <OrgasmChart orgasms={userOrgasms} />
        ) : (
          <a>Sign in to track orgasm</a>
        )}
      </div>
      {sessionData && (
        <button
          className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
          onClick={() => setNewOrgasm(true)}
        >
          I&apos;ve had an orgasm!
        </button>
      )}

      {newOrgasm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-0 left-0 flex h-screen w-screen items-center justify-center bg-black bg-opacity-40"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, originX: 0.5, originY: 0.5 }}
            animate={{ opacity: 1, scale: 1, transition: { delay: 0.1 } }}
            className="flex flex-col gap-4 rounded-lg bg-white p-4 text-black shadow-xl"
          >
            <h4 className="text-lg text-black">
              When did you have this orgasm?
            </h4>

            <form onSubmit={addOrgasm} className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 lg:grid lg:grid-flow-col lg:grid-rows-2 lg:items-center lg:gap-x-8">
                <label
                  htmlFor="orgasmDate"
                  className="text-sm font-bold uppercase"
                >
                  Date
                </label>
                <input
                  type="date"
                  ref={dateRef}
                  defaultValue={dayjs.utc().local().format("YYYY-MM-DD")}
                />

                <label
                  htmlFor="orgasmTime"
                  className="text-sm font-bold uppercase"
                >
                  Time
                </label>
                <input
                  type="time"
                  min="00:00:00"
                  max="24:00:00"
                  pattern="[0-9]{2}:[0-9]{2}"
                  ref={timeRef}
                  defaultValue={dayjs.utc().local().format("HH:mm")}
                />
              </div>

              <label
                htmlFor="orgasmNote"
                className="text-sm font-bold uppercase"
              >
                Notes
              </label>
              <textarea
                name="orgasmNote"
                id="orgasmNote"
                className="border p-2 text-sm outline-none"
                placeholder="Details you'd like to remember"
                ref={noteRef}
                rows={4}
              />

              <div className="mt-2 flex justify-between border-t px-4 pt-4">
                <button type="button" onClick={() => setNewOrgasm(false)}>
                  Cancel
                </button>
                <button type="submit">Save</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
