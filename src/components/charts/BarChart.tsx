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

const CHART_HEIGHT = 200;
const BAR_WIDTHS = [
  {
    view: "day",
    width: 8,
  },
  {
    view: "week",
    width: 40,
  },
  {
    view: "month",
    width: 60,
  },
];

export const BarChart: React.FC<BarChartProps> = ({ events, view }) => {
  const [orgs, setOrgs] = useState<BarChartEvent[]>([]);
  const [nMax, setNMax] = useState(8);

  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (events.length === 0) return;

    // const start = today.subtract(30, view).startOf(view);
    // find first event
    const today = dayjs();
    const firstEvent = events
      ?.map((o) => dayjs(o.date))
      .reduce((min, d) => (d < min ? d : min));

    const start = firstEvent?.startOf(view);

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
        const orgasms = events?.filter((o) => {
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
        className="relative w-full overflow-y-hidden overflow-x-scroll"
        style={{
          direction: "rtl",
          height: CHART_HEIGHT + "px",
        }}
      >
        <div className="absolute top-0 flex h-full">
          {orgs.map((o, index) => {
            const showMonth =
              index === 0
                ? false
                : dayjs(o.date).format("MMM") !==
                  dayjs(orgs.at(Math.max(index + 1))?.date).format("MMM");

            {
              /* show day if not day view OR date mod 5 is 1 */
            }
            const showDay = view !== "day" || dayjs(o.date).date() % 3 === 1;

            return (
              <div
                key={o.date}
                className={`mx-[2px] flex cursor-pointer flex-col items-center justify-center bg-opacity-10 pb-1`}
                style={{
                  width: BAR_WIDTHS.find((b) => b.view === view)?.width + "px",
                }}
              >
                <div
                  className={`flex h-full w-full flex-col justify-end ${
                    view === "month" ? "" : "gap-[3px]"
                  }  border-b border-b-white px-[2px] pb-1 hover:bg-pink-900`}
                >
                  {/* show count label on 'month' view */}
                  {view === "month" && (
                    <div className="mb-2 h-4 whitespace-nowrap text-[10px] font-bold text-white">
                      {o.orgasms.length}
                    </div>
                  )}
                  {o.orgasms.map((orgasm) => (
                    <div
                      key={orgasm.id}
                      className="group w-full bg-white hover:bg-pink-200"
                      style={{
                        height: (CHART_HEIGHT - 100) / nMax + "px",
                      }}
                      onClick={() => setNote(orgasm.note)}
                    ></div>
                  ))}
                </div>
                <div className="relative m-0 h-5 w-full p-0 text-[10px] text-white">
                  <div className="absolute left-1/2 top-0 -translate-x-1/2">
                    {showDay &&
                      dayjs(o.date).format(view === "month" ? "MMM" : "D")}
                  </div>
                </div>
                {view !== "month" && (
                  <div className="relative m-0 h-5 w-full p-0 text-[10px] text-white">
                    <div className="absolute left-1/2 top-0 -translate-x-1/2">
                      {showMonth && dayjs(o.date).format("MMM")}
                    </div>
                  </div>
                )}
                <div className="relative m-0 h-5 w-full p-0 text-[10px] text-white">
                  <div className="absolute left-1/2 top-0 -translate-x-1/2">
                    {showMonth && dayjs(o.date).format("YYYY")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-center text-xs text-white">
        <div className="uppercase">
          Number of orgasms per {view} {view === "week" && "starting"}
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
