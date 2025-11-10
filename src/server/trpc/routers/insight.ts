import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const insightRouter = createTRPCRouter({
  // List validated claims for a campaign
  listValidatedClaims: protectedProcedure
    .input(
      z.object({
        campaignId: z.string(),
        validated: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify campaign belongs to user's org
      const organizationId = ctx.memberships[0]?.organizationId;
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.campaignId,
          organizationId,
        },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      return ctx.db.claim.findMany({
        where: {
          call: {
            campaignId: input.campaignId,
          },
          validated: input.validated,
        },
        include: {
          call: {
            select: {
              id: true,
              phoneNumber: true,
              completedAt: true,
            },
          },
          hypothesis: {
            select: {
              id: true,
              question: true,
              status: true,
            },
          },
        },
        orderBy: {
          confidence: "desc",
        },
      });
    }),

  // List hypotheses for a campaign
  listHypotheses: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify campaign belongs to user's org
      const organizationId = ctx.memberships[0]?.organizationId;
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.campaignId,
          organizationId,
        },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      return ctx.db.hypothesis.findMany({
        where: {
          campaignId: input.campaignId,
        },
        include: {
          claims: {
            include: {
              call: {
                select: {
                  id: true,
                  phoneNumber: true,
                },
              },
            },
          },
          _count: {
            select: {
              claims: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),

  // Get hypothesis details
  getHypothesis: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const hypothesis = await ctx.db.hypothesis.findFirst({
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
          claims: {
            include: {
              call: {
                select: {
                  id: true,
                  phoneNumber: true,
                  completedAt: true,
                  recordingUrl: true,
                },
              },
            },
            orderBy: {
              confidence: "desc",
            },
          },
        },
      });

      if (!hypothesis) {
        throw new Error("Hypothesis not found");
      }

      // Verify hypothesis belongs to user's org
      const organizationId = ctx.memberships[0]?.organizationId;
      if (hypothesis.campaign.organizationId !== organizationId) {
        throw new Error("Unauthorized");
      }

      return hypothesis;
    }),
});

