import { Orgasm } from "@prisma/client";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

type DateOrgasmType = {
  date: string;
  orgasms: Orgasm[];
};

export const orgasmRouter = router({
  getUserOrgasms: protectedProcedure.query(async ({ ctx }) => {
    const orgasms = await ctx.prisma.orgasm.findMany({
      where: {
        userId: ctx.session.user.id,
      },
    });

    const dates = groupBy(orgasms, (orgasm) => orgasm.date);
    const result: DateOrgasmType[] = [];
    for (const [date, orgasms] of Object.entries(dates)) {
      result.push({
        date,
        orgasms,
      });
    }
    return result;
  }),
  addUserOrgasm: protectedProcedure
    // accept datetime input
    .input(
      z.object({
        date: z.string(),
        time: z.string(),
        note: z.string().nullable(),
      })
    )
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const user = ctx.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          orgasms: {
            create: {
              date: input.date,
              time: input.time,
              note: input.note,
            },
          },
        },
      });
      return user;
    }),
});

const groupBy = <T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => string
) =>
  array.reduce((acc, value, index, array) => {
    (acc[predicate(value, index, array)] ||= []).push(value);
    return acc;
  }, {} as { [key: string]: T[] });

export type { DateOrgasmType };
