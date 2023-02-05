import { motion } from "framer-motion";

import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useState } from "react";
import type { DateOrgasmType } from "../server/trpc/router/orgasms";
import { HeatMap } from "./charts/HeatMap";
import { BarChart } from "./charts/BarChart";
dayjs.extend(isoWeek);

type View = {
  name: "dow" | "day" | "week" | "month";
  label: string;
};
const views: View[] = [
  // { name: "dow", label: "Heatmap" },
  { name: "day", label: "Day" },
  { name: "week", label: "Week" },
  { name: "month", label: "Month" },
];

type OrgasmChartProps = {
  orgasms: DateOrgasmType[] | undefined;
};

const OrgasmChart: React.FC<OrgasmChartProps> = ({ orgasms }) => {
  const [showModal, setShowModal] = useState<DateOrgasmType | null>(null);

  // the type of chart to display
  const [view, setView] = useState<"dow" | "day" | "week" | "month">("day");

  const today = dayjs();
  const start =
    orgasms
      ?.map((o) => dayjs(o.date))
      .reduce((min, d) => (d < min ? d : min)) || today.subtract(1, "month");
  const n =
    orgasms?.map((o) => o.orgasms.length).reduce((a, b) => a + b, 0) || 0;

  // no orgasms? return!
  if (!orgasms || orgasms.length === 0) return <>No orgasms.</>;

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4">
      <div>
        You have had {n} orgasm{n !== 1 && "s"}!
      </div>

      {/* controls go here */}
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex flex-row items-center justify-center gap-4 text-sm">
          {views.map(({ name, label }) => (
            <button
              key={name}
              className={`rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20 ${
                view === name && "bg-white/20"
              }`}
              onClick={() => setView(name)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex h-[156px] w-full justify-center">
        {view === "dow" ? (
          <HeatMap
            events={orgasms}
            start={start}
            end={today}
            handler={setShowModal}
          />
        ) : (
          <BarChart events={orgasms} view={view} />
        )}
      </div>

      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed top-0 left-0 flex h-screen w-screen items-center justify-center bg-black bg-opacity-40"
          onClick={() => setShowModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, originX: 0.5, originY: 0.5 }}
            animate={{ opacity: 1, scale: 1, transition: { delay: 0.1 } }}
            className="mx-4 flex flex-col gap-8 rounded-lg bg-white p-4 text-black shadow-xl"
          >
            <h3 className="text-xl">
              {dayjs(showModal.date).format("dddd D MMMM, YYYY")}
            </h3>
            <p>
              You had {showModal.orgasms.length} orgasm
              {showModal.orgasms.length !== 1 && "s"}!
            </p>
            <div className="flex flex-col gap-4 text-sm lg:mx-4">
              {showModal.orgasms
                .sort((a, b) => (a.time >= b.time ? 1 : -1))
                .map((o) => (
                  <div
                    className="flex flex-col border-b pb-4 lg:flex-row lg:px-8"
                    key={o.id}
                  >
                    <div className="font-bold lg:w-40">
                      {dayjs
                        .utc(o.date + " " + o.time)
                        .local()
                        .format("HH:mm a")}
                    </div>
                    <div className="">{o.note}</div>
                  </div>
                ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default OrgasmChart;

// function getRange(count: number) {
//   return Array.from({ length: count }, (_, i) => i);
// }
