import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";

export const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: {
        id: ctx.session.user.id,
      },
      select: {
        username: true,
        publicProfile: true,
        publicOrgasms: true,
      },
    });
    return user;
  }),
  checkUsername: publicProcedure
    .input(
      z.object({
        username: z.string().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { username } = input;
      if (!username || username.length < 3) {
        return false;
      }
      const user = await ctx.prisma.user.count({
        where: {
          username,
        },
      });
      return user === 0;
    }),
  update: protectedProcedure
    .input(
      z.object({
        username: z.string().nullable(),
        publicProfile: z.boolean(),
        publicOrgasms: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { username, publicProfile, publicOrgasms } = input;

      const user = await ctx.prisma.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          username: username && username.length < 3 ? undefined : username,
          publicProfile:
            username && username.length < 3 ? false : publicProfile,
          publicOrgasms:
            username && publicProfile && username.length < 3
              ? false
              : publicOrgasms,
        },
      });
      return user;
    }),
});
