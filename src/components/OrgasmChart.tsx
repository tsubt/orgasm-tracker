import { Prisma } from "@prisma/client";

type OrgasmChartProps = {
  orgasms:
    | (Prisma.PickArray<Prisma.OrgasmGroupByOutputType, "date"[]> & {
        _count: {
          date: number;
        };
      })[]
    | undefined;
};

const OrgasmChart: React.FC<OrgasmChartProps> = ({ orgasms }) => {
  let n = 0;
  orgasms?.map((x) => (n += x._count.date));

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      You have had {n} orgasm{n !== 1 && "s"}!
    </div>
  );
};

export default OrgasmChart;
