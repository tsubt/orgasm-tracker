import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { Analytics } from "@vercel/analytics/react";

import { trpc } from "../utils/trpc";

import "../styles/globals.css";
import Layout from "../layout/Layout";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
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
