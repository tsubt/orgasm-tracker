import { z } from "zod";

import { router, protectedProcedure } from "../trpc";

export const orgasmRouter = router({
//   hello: publicProcedure
//     .input(z.object({ text: z.string().nullish() }).nullish())
//     .query(({ input }) => {
//       return {
//         greeting: `Hello ${input?.text ?? "world"}`,
//       };
//     }),
//   getAll: publicProcedure.query(({ ctx }) => {
//     return ctx.prisma.example.findMany();
//   }),
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
