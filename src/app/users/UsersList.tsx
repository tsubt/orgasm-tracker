import { prisma } from "@/prisma";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { Orgasm, User } from "@prisma/client";

dayjs.extend(relativeTime);

export default async function UsersList() {
  const users = await prisma.user.findMany({
    where: {
      publicProfile: true,
    },
    include: {
      orgasms: true,
    },
  });

  // Sort by lastSeen (most recent first)
  const sortedUsers = users.sort((a, b) =>
    dayjs(a.lastSeen).isAfter(dayjs(b.lastSeen)) ? -1 : 1
  );

  if (sortedUsers.length === 0) {
    return <p className="text-white">No users found</p>;
  }

  return (
    <>
      {sortedUsers.map((user) => (
        <UserCard user={user} key={user.id} />
      ))}
    </>
  );
}

function UserCard({
  user,
}: {
  user: User & {
    orgasms: Orgasm[];
  };
}) {
  // Get the last orgasm - use timestamp if available, otherwise construct from date and time
  const orgasms = user.orgasms
    .map((o) => {
      if (o.timestamp) {
        return { ...o, datetime: dayjs(o.timestamp) };
      }
      return { ...o, datetime: dayjs(`${o.date} ${o.time}`) };
    })
    .sort((x, y) => {
      return x.datetime.isAfter(y.datetime) ? -1 : 1;
    });

  const lastOrgasm = orgasms[0];

  return (
    <div className="flex items-start justify-between rounded-sm bg-pink-200 p-4 shadow-sm">
      <div className="flex-col">
        <Link href={"/u/" + user.username} className="text-lg text-pink-800">
          <strong>@{user.username}</strong>
        </Link>
        <div className="flex-col">
          {orgasms.length ? (
            <>
              {orgasms.length} orgasm{orgasms.length > 1 && "s"} tracked
              {lastOrgasm && (
                <> last orgasm was {lastOrgasm.datetime.fromNow()}</>
              )}
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
}
