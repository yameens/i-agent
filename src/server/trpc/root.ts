import { createTRPCRouter } from "./trpc";
import { campaignRouter } from "./routers/campaign";
import { callRouter } from "./routers/call";
import { insightRouter } from "./routers/insight";

export const appRouter = createTRPCRouter({
  campaign: campaignRouter,
  call: callRouter,
  insight: insightRouter,
});

export type AppRouter = typeof appRouter;

