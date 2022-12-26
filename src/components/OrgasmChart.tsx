import { motion } from "framer-motion";

import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useState } from "react";
import { DateOrgasmType } from "../server/trpc/router/orgasms";
dayjs.extend(isoWeek);

type OrgasmChartProps = {
  orgasms: DateOrgasmType[] | undefined;
};

const OrgasmChart: React.FC<OrgasmChartProps> = ({ orgasms }) => {
  const [showModal, setShowModal] = useState<DateOrgasmType | null>(null);

  // calculate total number of orgasms
  if (!orgasms || orgasms.length === 0) return <>No orgasms.</>;

  const n =
    orgasms?.map((o) => o.orgasms.length).reduce((a, b) => a + b, 0) || 0;

  const today = dayjs();
  // find earliest date
  const start =
    orgasms
      ?.map((o) => dayjs(o.date))
      .reduce((min, d) => (d < min ? d : min)) || today.subtract(1, "month");

  // generate coordinates for heatmap
  const xMin = today.isoWeek() - start.isoWeek() + 1,
    xMax = 0;
  const yMin = 7,
    yMax = 0;
  const squareSize = 20;

  const nMax =
    orgasms?.reduce(
      (max, org) => (org.orgasms.length > max ? org.orgasms.length : max),
      0
    ) || 1;

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4">
      <div>
        You have had {n} orgasm{n !== 1 && "s"}!
      </div>

      <div className="relative flex h-[156px] w-full justify-center overflow-hidden">
        <svg
          width={xMin * squareSize}
          height={yMin * squareSize}
          className="absolute right-0 m-2"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g strokeWidth="1" stroke="">
            {orgasms?.map((org) => (
              <motion.rect
                key={org.date}
                x={
                  (xMin - today.isoWeek() + dayjs(org.date).isoWeek() - 1) *
                  squareSize
                }
                y={(dayjs(org.date).isoWeekday() - 1) * squareSize}
                width={squareSize}
                height={squareSize}
                fill={`rgba(147, 197, 253, ${org.orgasms.length / nMax})`}
                initial={{ opacity: 0, scale: 0.9, originX: 0.5, originY: 0.5 }}
                animate={{ opacity: 1, scale: 0.9 }}
                whileHover={{ scale: 1 }}
                className="cursor-pointer"
                onClick={() => setShowModal(org)}
              />
            ))}
          </g>
        </svg>
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
                  <div className="flex flex-col border-b pb-4 lg:flex-row lg:px-8">
                    <div key={o.id} className="font-bold lg:w-40">
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

function getRange(count: number) {
  return Array.from({ length: count }, (_, i) => i);
}
