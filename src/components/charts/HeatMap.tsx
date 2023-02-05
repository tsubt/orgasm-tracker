import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import React from "react";
import type { Dispatch, SetStateAction } from "react";
import type { DateOrgasmType } from "../../server/trpc/router/orgasms";
import { motion } from "framer-motion";

type HeatMapProps = {
  events: DateOrgasmType[];
  start: Dayjs;
  end: Dayjs;
  handler: Dispatch<SetStateAction<DateOrgasmType | null>>;
};

export const HeatMap: React.FC<HeatMapProps> = ({
  events,
  start,
  end,
  handler,
}) => {
  const getX = (d: Dayjs) => {
    return (
      d.isoWeek() / 100 + d.year() - (start.isoWeek() / 100 + start.year())
    );
  };
  // generate coordinates for heatmap
  const xMin = getX(end);
  // xMax = 0;
  const yMin = 7;
  // yMax = 0;
  const squareSize = 20;

  const nMax =
    events?.reduce(
      (max, org) => (org.orgasms.length > max ? org.orgasms.length : max),
      0
    ) || 1;

  return (
    <>
      <svg
        width={xMin * squareSize}
        height={yMin * squareSize}
        className="absolute right-0 m-2"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g strokeWidth="1" stroke="">
          {events?.map((org) => (
            <motion.rect
              key={org.date}
              x={getX(dayjs(org.date)) * squareSize}
              y={(dayjs(org.date).isoWeekday() - 1) * squareSize}
              width={squareSize}
              height={squareSize}
              fill={`rgba(147, 197, 253, ${org.orgasms.length / nMax})`}
              initial={{ opacity: 0, scale: 0.9, originX: 0.5, originY: 0.5 }}
              animate={{ opacity: 1, scale: 0.9 }}
              whileHover={{ scale: 1 }}
              className="cursor-pointer"
              onClick={() => handler(org)}
            />
          ))}
        </g>
      </svg>
    </>
  );
};
