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
  const [nMax, setNMax] = useState(8);

  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    // const start = today.subtract(30, view).startOf(view);
    // find first event
    const today = dayjs();
    const start =
      events
        ?.map((o) => dayjs(o.date))
        .reduce((min, d) => (d < min ? d : min)) || today.subtract(1, "month");

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
      .sort((a, b) => -dayjs(a.date).diff(dayjs(b.date)));

    setOrgs(dateList);
    // find max length of orgasms in each dateList
    setNMax(Math.max(...dateList.map((o) => o.orgasms.length), 1));
  }, [events, view]);

  return (
    <div className="flex h-full w-full max-w-[1000px] flex-col gap-4">
      <div
        className="relative flex h-full w-full overflow-x-scroll"
        style={{ direction: "rtl" }}
      >
        <div className="absolute top-0 flex h-full">
          {orgs.map((o, index) => {
            const showYear =
              index === 0
                ? false
                : dayjs(o.date).format("YYYY") !==
                  dayjs(orgs.at(Math.max(index - 1))?.date).format("YYYY");

            return (
              <div
                key={o.date}
                className="mx-[2px] flex w-8 cursor-pointer flex-col items-center justify-center bg-opacity-10 pb-1 "
              >
                <div className="flex h-full w-full flex-col justify-end gap-[3px]  border-b border-b-white px-[2px] pb-1 hover:bg-pink-900">
                  {o.orgasms.map((orgasm) => (
                    <div
                      key={orgasm.id}
                      className="group w-full bg-white hover:bg-pink-200"
                      style={{
                        height: 100 / nMax,
                      }}
                      onClick={() => setNote(orgasm.note)}
                    ></div>
                  ))}
                </div>
                <div className="h-4 text-[8px] text-white">
                  {dayjs(o.date).format(view === "month" ? "MMM" : "MMM D")}
                </div>
                <div className="m-0 h-12 w-full p-0 text-[10px] text-white">
                  {showYear && dayjs(o.date).format("YYYY")}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-center text-xs text-white">
        <div className="uppercase">
          {view} {view === "week" && "starting"}
        </div>
      </div>

      {note && (
        <div className="fixed inset-0 flex items-center justify-center gap-4 bg-black bg-opacity-80 text-sm text-black">
          <div className="flex flex-col gap-4 rounded-lg bg-gray-300 px-8 pt-8 pb-4">
            <div className="">{note}</div>
            {/* close button */}
            <button
              className="top-0 right-0 m-2 cursor-pointer rounded border bg-pink-700  px-3 py-2 text-xs font-bold text-white"
              onClick={() => setNote(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
