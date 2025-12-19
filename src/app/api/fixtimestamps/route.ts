import { prisma } from "@/prisma";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(timezone);
dayjs.extend(utc);

export async function GET() {
  const orgasms = await prisma.orgasm.findMany({
    where: {
      timestamp: null,
    },
  });

  await Promise.all(
    orgasms.map(async ({ id, date, time }) => {
      const d = {
        id,
        timestamp: dayjs(`${date} ${time}`).tz("Pacific/Auckland").toDate(),
      };
      await prisma.orgasm.update({
        where: {
          id: d.id,
        },
        data: {
          timestamp: d.timestamp,
        },
      });
      return d;
    })
  );

  return Response.json({ status: "OK" });
}
