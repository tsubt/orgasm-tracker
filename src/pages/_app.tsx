import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { Analytics } from "@vercel/analytics/react";

import { trpc } from "../utils/trpc";

import "../styles/globals.css";
import Layout from "../layout/Layout";
import { useEffect } from "react";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  // update last seen
  trpc.users.seen.useQuery();
  const utils = trpc.useContext();

  // invalidate trpc.users.seen every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      utils.users.seen.invalidate();
    }, 1000 * 60 * 5);

    return () => clearInterval(interval);
  }, [utils]);

  return (
    <SessionProvider session={session}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
      <Analytics />
    </SessionProvider>
  );
};

export default trpc.withTRPC(MyApp);
