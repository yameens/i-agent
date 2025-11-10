import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const callRouter = createTRPCRouter({
  // List calls for a campaign
  listByCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify campaign belongs to user's org
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.campaignId,
          organizationId: ctx.organizationId,
        },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      const calls = await ctx.db.call.findMany({
        where: {
          campaignId: input.campaignId,
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          _count: {
            select: {
              utterances: true,
              claims: true,
            },
          },
        },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (calls.length > input.limit) {
        const nextItem = calls.pop();
        nextCursor = nextItem!.id;
      }

      return {
        calls,
        nextCursor,
      };
    }),

  // Get a single call with details
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const call = await ctx.db.call.findFirst({
        where: {
          id: input.id,
        },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              organizationId: true,
            },
          },
          utterances: {
            orderBy: {
              timestamp: "asc",
            },
          },
          claims: {
            include: {
              hypothesis: {
                select: {
                  id: true,
                  question: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!call) {
        throw new Error("Call not found");
      }

      // Verify call belongs to user's org
      if (call.campaign.organizationId !== ctx.organizationId) {
        throw new Error("Unauthorized");
      }

      return call;
    }),
});

