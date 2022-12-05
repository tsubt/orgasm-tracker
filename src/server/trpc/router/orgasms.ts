
import { router, protectedProcedure } from "../trpc";

export const orgasmRouter = router({
  getUserOrgasms: protectedProcedure.query(({ctx}) => {
    const userId = ctx.session.user.id;
    const user = ctx.prisma.user.findUnique({
        where: {
            id: userId,
        },
    })
    return user.orgasms();
  }),
  addUserOrgasm: protectedProcedure.mutation(({ctx}) => {
    const userId = ctx.session.user.id;
    const user = ctx.prisma.user.update({
      where: {
          id: userId,
      },
      data: {
        orgasms: {
          create: {}
        }
      }
    })

    return user;
  })
});
