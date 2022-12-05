import { router } from "../trpc";
import { authRouter } from "./auth";
import { exampleRouter } from "./example";
import { orgasmRouter } from "./orgasms";

export const appRouter = router({
  example: exampleRouter,
  auth: authRouter,
  orgasms: orgasmRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
