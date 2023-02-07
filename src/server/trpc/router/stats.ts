import { z } from "zod";

import { router, publicProcedure } from "../trpc";

export const statsRouter = router({
  userCount: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.user.count();
  }),
});
