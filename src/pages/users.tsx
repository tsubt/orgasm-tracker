import Head from "next/head";
import { trpc } from "../utils/trpc";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);
import { type Orgasm, type User } from "@prisma/client";

export default function UsersPage() {
  const { data: users, isLoading, isError } = trpc.users.public.useQuery();

  if (isLoading) <>Loading ...</>;
  if (isError) <>Error</>;

  return (
    <>
      <Head>
        <title>OrgasmTracker | Users</title>
        <meta name="description" content="List of users with public profiles" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h2 className="text-lg font-bold uppercase tracking-wider text-white">
          Public Users
        </h2>

        <div className="flex w-full max-w-4xl flex-col gap-4 text-black">
          {users
            ?.sort((a, b) =>
              dayjs(a.lastSeen).isAfter(dayjs(b.lastSeen)) ? -1 : 1
            )
            .map((user) => <UserCard user={user} key={user.id} />) || (
            <p>No users found</p>
          )}
        </div>
      </div>
    </>
  );
}

const UserCard = ({
  user,
}: {
  user: User & {
    orgasms: Orgasm[];
  };
}) => {
  const orgasms = user.orgasms.map((o) => ({
    ...o,
    datetime: dayjs(`${o.date} ${o.time}`),
  }));
  const lastOrgasm = orgasms
    .sort((x, y) => {
      return x.datetime.isAfter(y.datetime) ? -1 : 1;
    })
    .at(1);

  return (
    <div className="flex items-start justify-between rounded bg-pink-200 p-4 shadow">
      <div className="flex-col">
        <Link href={"/u/" + user.username} className="text-lg text-pink-800">
          <strong>@{user.username}</strong>
        </Link>
        <div className="flex-col">
          {orgasms.length ? (
            <>
              {user.orgasms.length} orgasms tracked, last orgasm was{" "}
              {dayjs(lastOrgasm?.datetime).fromNow()}
            </>
          ) : (
            <>No orgasms tracked.</>
          )}
        </div>
      </div>

      <div className="flex items-center text-xs">
        Joined: {dayjs(user.joinedAt).format("DD MMM YYYY")}
        <div className="mx-2 h-1 w-1 rounded-full bg-black"></div>
        Last seen: {dayjs(user.lastSeen).fromNow()}
      </div>
    </div>
  );
};
