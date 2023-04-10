import type { Orgasm } from "@prisma/client";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import React, { useEffect, useState } from "react";
import type { DateOrgasmType } from "../../server/trpc/router/orgasms";

import { AnimatePresence, motion } from "framer-motion";
import { TypeColours } from "../Orgasm";

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
const BAR_TIMING = 0.05;

const BAR_COLOURS = TypeColours;

export const BarChart: React.FC<BarChartProps> = ({ events, view }) => {
  const [orgs, setOrgs] = useState<BarChartEvent[]>([]);
  const [nMax, setNMax] = useState(8);
  const [record, setRecord] = useState(0);
  const [average, setAverage] = useState(0);

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

    // find max orgasms in a day
    setRecord(Math.max(...dateList.map((o) => o.orgasms.length), 1));
    // find average orgasms per view
    setAverage(
      Math.round(
        (dateList.reduce((a, b) => a + b.orgasms.length, 0) / dateList.length) *
          100
      ) / 100
    );

    setOrgs(dateList);
    // find max length of orgasms in each dateList
    setNMax(Math.max(...dateList.map((o) => o.orgasms.length), 1));
  }, [events, view]);

  return (
    <div className="flex h-full w-full max-w-[1000px] flex-col gap-4">
      <div className="flex w-full flex-col gap-1">
        <div className="flex justify-end gap-8 text-sm">
          <div>Record: {record}</div>
          <div>
            Average: {average} per {view}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {BAR_COLOURS.map((c) => (
            <div
              key={c.type}
              className="flex items-center justify-center px-1 text-xs text-black"
              style={{
                backgroundColor: c.colour,
              }}
            >
              {c.type}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <div className="flex items-center justify-center gap-1 px-1 text-xs text-white">
            <div className="h-1 w-1 rounded-full border border-white bg-black"></div>
            Virtual partner
          </div>
          <div className="flex items-center justify-center gap-1 px-1 text-xs text-white">
            <div className="bg-red h-1 w-1 rounded-full border border-black bg-black"></div>
            Physical partner
          </div>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <div
          className="relative w-full overflow-y-hidden overflow-x-scroll"
          style={{
            direction: "rtl",
            height: CHART_HEIGHT + "px",
          }}
        >
          <div className="absolute top-0 flex h-full">
            {orgs.map((o, index) => {
              const showYear =
                dayjs(o.date).format("YYYY") !==
                dayjs(orgs.at(index + 1)?.date).format("YYYY");

              const showMonth =
                // index === 0
                //   ? true
                dayjs(o.date).format("MMM") !==
                dayjs(orgs.at(Math.max(index + 1))?.date).format("MMM");

              {
                /* show day if not day view OR date mod 5 is 1 */
              }
              const showDay = view !== "day" || dayjs(o.date).date() % 3 === 1;

              // sort orgasms by time
              const Os = o.orgasms
                .map((o) => ({
                  ...o,
                  time: dayjs(o.date + " " + o.time),
                }))
                .sort((a, b) => -a.time.diff(b.time));

              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  // exit={{ opacity: 0, transition: { delay: 1 } }}
                  key={view + o.date}
                  // layoutId={"view" + o.date}
                  className={`mx-[2px] flex cursor-pointer flex-col items-center justify-center bg-opacity-10 pb-1`}
                  style={{
                    width:
                      BAR_WIDTHS.find((b) => b.view === view)?.width + "px",
                  }}
                >
                  <div
                    className={`flex h-full w-full flex-col justify-end ${
                      view === "month" ? "" : "gap-[3px]"
                    }  border-b border-b-white px-[2px] pb-1 hover:bg-pink-900`}
                  >
                    {/* show count label on 'month' view */}
                    {view === "month" && (
                      <motion.div
                        key={view + o.date + "count"}
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: 1,
                          // transition: {
                          //   delay: BAR_TIMING * Os.length,
                          // },
                        }}
                        exit={{ opacity: 0 }}
                        className="mb-2 h-4 whitespace-nowrap text-[10px] font-bold text-white"
                      >
                        {Os.length}
                      </motion.div>
                    )}
                    <div
                      className={`flex flex-col-reverse ${
                        view === "month" ? "" : "gap-[3px]"
                      }`}
                    >
                      {Os.map((orgasm, index) => (
                        <motion.div
                          key={view + orgasm.id + index}
                          initial={{ opacity: 0 }}
                          animate={{
                            opacity: 1,
                            transition: { delay: index * BAR_TIMING },
                          }}
                          exit={{ opacity: 0 }}
                          className="w-fullhover:bg-pink-200 group relative"
                          style={{
                            height: (CHART_HEIGHT - 100) / nMax + "px",
                            background:
                              BAR_COLOURS.find((c) => c.type === orgasm.type)
                                ?.colour || "white",
                          }}
                          onClick={() => setNote(orgasm.note)}
                        >
                          {orgasm.sex !== "SOLO" && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div
                                className="h-1 w-1 rounded-full border bg-black"
                                style={{
                                  borderColor:
                                    orgasm.sex === "VIRTUAL"
                                      ? "white"
                                      : "black",
                                }}
                              ></div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
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
                      {showYear && dayjs(o.date).format("YYYY")}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </AnimatePresence>
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
