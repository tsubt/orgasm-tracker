import type { Orgasm } from "@prisma/client";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import React, { useEffect, useState } from "react";
import type { DateOrgasmType } from "../../server/trpc/router/orgasms";

dayjs.extend(weekOfYear);

type BarChartProps = {
  events: DateOrgasmType[];
  view: "day" | "week" | "month";
};

type BarChartEvent = {
  date: string;
  orgasms: Orgasm[];
};

export const BarChart: React.FC<BarChartProps> = ({ events, view }) => {
  const [orgs, setOrgs] = useState<BarChartEvent[]>([]);
  // const [nOrg, setNOrg] = useState(0);
  // const [startDate, setStartDate] = useState(dayjs());

  const today = dayjs();

  useEffect(() => {
    const start = today.subtract(30, view).startOf(view);

    const filtered = events?.filter((o) => dayjs(o.date) > start);

    // create a list of dates from start to today by view
    const dates = [];
    let d = start;
    while (d < today) {
      dates.push(d.format("YYYY-MM-DD"));
      d = d.add(1, view);
    }

    // for each date, find all orgasms that happened after that date and before the next date
    const dateList = dates
      .map((date) => {
        const orgasms = filtered?.filter((o) => {
          const d = dayjs(o.date);
          return d >= dayjs(date) && d < dayjs(date).add(1, view);
        });
        return {
          date,
          orgasms: orgasms.map((o) => o.orgasms).flat(1) || [],
        };
      })
      .sort((a, b) => (a.date > b.date ? 1 : -1));
    setOrgs(dateList);
    // setNOrg(
    //   filtered?.map((o) => o.orgasms.length).reduce((a, b) => a + b, 0) || 0
    // );
    // setStartDate(start);
  }, [today, events, view]);

  return (
    <div className="flex h-full w-full max-w-[1000px] flex-col gap-4">
      <div className="flex h-full w-full">
        {orgs.map((o, index) => (
          <div
            key={o.date}
            className="mx-[2px] flex w-[3.33%] cursor-pointer flex-col items-center justify-center bg-opacity-10 pb-1 "
          >
            <div className="flex h-full w-full flex-col justify-end gap-[2px]  border-b border-b-white px-[2px] pb-1 hover:bg-pink-900">
              {o.orgasms.map((orgasm) => (
                <div
                  key={orgasm.id}
                  className={`group relative h-[12.5%] w-full bg-white hover:bg-pink-200`}
                >
                  {orgasm.note && (
                    <>
                      <div className="absolute top-0 left-1/2 hidden -translate-x-1/2 -translate-y-[110%] pb-2 group-hover:block">
                        <div className="w-[300px] rounded bg-gray-50 bg-opacity-20 p-2 text-sm">
                          {orgasm.note}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="text-xs text-white">{30 - index}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-center text-xs text-white">
        <div className="uppercase">{view}s ago</div>
      </div>
    </div>
  );
};
