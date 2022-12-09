import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const orgasmRouter = router({
  getUserOrgasms: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.orgasm.groupBy({
      by: ["date"],
      where: {
        userId: ctx.session.user.id,
      },
      _count: {
        date: true,
      },
      orderBy: [
        {
          date: "asc",
        },
      ],
    });
  }),
  addUserOrgasm: protectedProcedure
    // accept datetime input
    .input(
      z.object({
        date: z.string(),
        time: z.string(),
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
            },
          },
        },
      });
      return user;
    }),
});
