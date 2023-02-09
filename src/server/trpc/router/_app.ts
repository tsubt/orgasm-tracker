import { router } from "../trpc";
import { authRouter } from "./auth";
import { orgasmRouter } from "./orgasms";
import { settingsRouter } from "./settings";
import { statsRouter } from "./stats";
import { usersRouter } from "./users";

export const appRouter = router({
  auth: authRouter,
  orgasms: orgasmRouter,
  stats: statsRouter,
  users: usersRouter,
  settings: settingsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
