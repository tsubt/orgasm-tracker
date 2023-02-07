import { router } from "../trpc";
import { authRouter } from "./auth";
import { exampleRouter } from "./example";
import { orgasmRouter } from "./orgasms";
import { statsRouter } from "./stats";

export const appRouter = router({
  example: exampleRouter,
  auth: authRouter,
  orgasms: orgasmRouter,
  stats: statsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
