import { type Orgasm, OrgasmType, SexType } from "@prisma/client";
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";

type DateOrgasmType = {
  date: string;
  orgasms: Orgasm[];
};

export const orgasmRouter = router({
  getUserIdOrgasms: publicProcedure
    .input(
      z.object({
        userId: z.string().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!input.userId) return null;

      // check user permissions
      const user = await ctx.prisma.user.findUnique({
        where: {
          username: input.userId,
        },
      });
      if (!user) return null;
      if (!user.publicOrgasms) return null;

      const orgasms = await ctx.prisma.orgasm.findMany({
        where: {
          userId: user.id,
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
  get: protectedProcedure.query(async ({ ctx }) => {
    const orgasms = await ctx.prisma.orgasm.findMany({
      where: {
        userId: ctx.session.user.id,
      },
    });

    return orgasms.sort((a, b) => {
      if (a.date > b.date) return -1;
      if (a.date < b.date) return 1;
      if (a.time > b.time) return -1;
      if (a.time < b.time) return 1;
      return 0;
    });
  }),
  edit: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        date: z.string(),
        time: z.string(),
        type: z.nativeEnum(OrgasmType),
        sex: z.nativeEnum(SexType),
        note: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgasm = await ctx.prisma.orgasm.update({
        where: {
          id: input.id,
        },
        data: {
          date: input.date,
          time: input.time,
          type: input.type,
          sex: input.sex,
          note: input.note,
        },
      });
      return orgasm;
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgasm = await ctx.prisma.orgasm.delete({
        where: {
          id: input.id,
        },
      });
      return orgasm;
    }),
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
        type: z.nativeEnum(OrgasmType),
        sex: z.nativeEnum(SexType),
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
              type: input.type,
              sex: input.sex,
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
