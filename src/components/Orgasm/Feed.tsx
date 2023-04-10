import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);
import { trpc } from "../../utils/trpc";
import { PartnerTag, TypeTag } from "./Tag";
import { useState } from "react";

const Feed = () => {
  const [limit, setLimit] = useState(10);
  const { data } = trpc.orgasms.publicFeed.useQuery({
    limit: limit,
  });

  // if (isLoading) return <>Loading...</>;
  // if (isError) return <>Error</>;

  if (!data) return <>No orgasms to show.</>;

  const orgasms = data
    .map((orgasm) => ({
      ...orgasm,
      datetime: dayjs(`${orgasm.date} ${orgasm.time}`),
    }))
    .sort((a, b) => b.datetime.diff(a.datetime));

  return (
    <div className="flex w-full flex-col gap-4 px-8">
      {orgasms.map((orgasm) => (
        <div
          className="flex flex-col gap-1 rounded bg-pink-900 p-2 shadow"
          key={orgasm.id}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="font-bold">@{orgasm.user.username}</div>
              <div className="h-1 w-1 rounded-full bg-white"></div>
              <div>{orgasm.datetime.fromNow()}</div>
            </div>
            <div className="flex items-center gap-2">
              <TypeTag label={orgasm.type} />
              <PartnerTag label={orgasm.sex} />
            </div>
          </div>
          <div>
            {orgasm.note || <span className="italic opacity-70">&mdash;</span>}
          </div>
        </div>
      ))}
      <div
        className="cursor-pointer rounded bg-pink-900 p-2 text-center italic shadow"
        onClick={() => setLimit((l) => l + 10)}
      >
        Load more &hellip;
      </div>
    </div>
  );
};

export default Feed;
