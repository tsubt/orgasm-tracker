import type {
  GetServerSideProps,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import OrgasmChart from "../../components/OrgasmChart";
import { trpc } from "../../utils/trpc";

const UserPage: NextPage<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ title }) => {
  const router = useRouter();
  const { userid } = router.query;

  const { data: userOrgasms, isLoading } =
    trpc.orgasms.getUserIdOrgasms.useQuery(
      { userId: userid as string },
      { enabled: userid !== undefined }
    );

  return (
    <>
      <Head>
        <title>OrgasmTracker | {userid as string}</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-pink-700 to-pink-900">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            {title}
          </h1>

          <h2 className="text-lg font-bold uppercase tracking-wider text-white">
            {userid}
          </h2>

          <div className="w-full text-center text-white">
            {isLoading ? (
              <div>Loading...</div>
            ) : userOrgasms ? (
              <OrgasmChart orgasms={userOrgasms} />
            ) : (
              <>
                That user does not exist, is not public, or has no orgasms to
                show.
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default UserPage;

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {
      title: process.env.APP_TITLE || "Orgasm Tracker",
    },
  };
};
