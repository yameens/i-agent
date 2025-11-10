import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../trpc";

export const campaignRouter = createTRPCRouter({
  // List all campaigns for the user's organization
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.campaign.findMany({
      where: {
        organizationId: ctx.organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            calls: true,
            hypotheses: true,
          },
        },
      },
    });
  }),

  // Get a single campaign by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
        include: {
          calls: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          hypotheses: {
            include: {
              _count: {
                select: { claims: true },
              },
            },
          },
        },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      return campaign;
    }),

  // Create a new campaign (admin only)
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        category: z.string().min(1),
        checklistId: z.string().min(1),
        promptTemplate: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.campaign.create({
        data: {
          ...input,
          organizationId: ctx.organizationId,
          status: "DRAFT",
        },
      });
    }),

  // Update a campaign (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        checklistId: z.string().min(1).optional(),
        promptTemplate: z.string().min(1).optional(),
        status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify campaign belongs to user's org
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id,
          organizationId: ctx.organizationId,
        },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      return ctx.db.campaign.update({
        where: { id },
        data,
      });
    }),

  // Delete a campaign (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify campaign belongs to user's org
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      return ctx.db.campaign.delete({
        where: { id: input.id },
      });
    }),

  // Get campaign statistics
  getStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.organizationId,
        },
        include: {
          calls: {
            select: {
              status: true,
              duration: true,
              consentGiven: true,
            },
          },
          hypotheses: {
            select: {
              status: true,
              _count: {
                select: { claims: true },
              },
            },
          },
        },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      const totalCalls = campaign.calls.length;
      const completedCalls = campaign.calls.filter(
        (c) => c.status === "COMPLETED"
      ).length;
      const totalDuration = campaign.calls.reduce(
        (sum, c) => sum + (c.duration || 0),
        0
      );
      const consentRate =
        totalCalls > 0
          ? campaign.calls.filter((c) => c.consentGiven).length / totalCalls
          : 0;

      const hypothesesByStatus = campaign.hypotheses.reduce(
        (acc, h) => {
          acc[h.status] = (acc[h.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        totalCalls,
        completedCalls,
        totalDuration,
        consentRate,
        hypothesesByStatus,
        totalHypotheses: campaign.hypotheses.length,
      };
    }),
});

