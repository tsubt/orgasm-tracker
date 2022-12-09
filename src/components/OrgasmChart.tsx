import { Prisma } from "@prisma/client";

import { motion } from "framer-motion";

import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useState } from "react";
dayjs.extend(isoWeek);

type OrgasmType = Prisma.PickArray<Prisma.OrgasmGroupByOutputType, "date"[]> & {
  _count: {
    date: number;
  };
};
type OrgasmChartProps = {
  orgasms: OrgasmType[] | undefined;
};

const OrgasmChart: React.FC<OrgasmChartProps> = ({ orgasms }) => {
  const [showModal, setShowModal] = useState<OrgasmType | null>(null);

  let n = 0;
  orgasms?.map((x) => (n += x._count.date));

  const today = dayjs();
  const start = dayjs(orgasms?.at(0)?.date || today.subtract(5, "week"));
  // const dateStart = new Date(orgasms?.at(0)?.date || new Date());

  // generate coordinates for heatmap
  const xMin = today.isoWeek() - start.isoWeek() + 1,
    xMax = 0;
  const yMin = 7,
    yMax = 0;
  const squareSize = 20;

  const nMax =
    orgasms?.reduce(
      (max, org) => (org._count.date > max ? org._count.date : max),
      0
    ) || 1;

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4">
      <div>
        You have had {n} orgasm{n !== 1 && "s"}!
      </div>

      <div className="flex justify-center">
        {/* <svg viewBox={`{0 0 ${xMin} ${yMin}}`} className="bg-white"> */}
        <svg
          width={xMin * squareSize}
          height={yMin * squareSize}
          className="m-2 "
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
                fill={`rgba(147, 197, 253, ${org._count.date / nMax})`}
                initial={{ opacity: 0, scale: 0.9 }}
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
        <div
          className="fixed top-0 left-0 flex h-screen w-screen items-center justify-center bg-black bg-opacity-40"
          onClick={() => setShowModal(null)}
        >
          <div className="flex flex-col gap-8 rounded-lg bg-white p-4 text-black shadow-xl">
            <h3 className="text-xl">
              {dayjs(showModal.date).format("dddd D MMMM, YYYY")}
            </h3>
            <p>
              You had {showModal._count.date} orgasm
              {showModal._count.date !== 1 && "s"}!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgasmChart;

function getRange(count: number) {
  return Array.from({ length: count }, (_, i) => i);
}
