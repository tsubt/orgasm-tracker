import { router, protectedProcedure, publicProcedure } from "../trpc";

export const usersRouter = router({
  self: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: {
        id: ctx.session.user.id,
      },
    });
    return user;
  }),
  public: publicProcedure.query(async ({ ctx }) => {
    const users = await ctx.prisma.user.findMany({
      where: {
        publicProfile: true,
      },
      include: {
        orgasms: true,
      },
    });
    return users;
  }),
  seen: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.update({
      where: {
        id: ctx.session.user.id,
      },
      data: {
        lastSeen: new Date(),
      },
    });
    return user;
  }),
});
