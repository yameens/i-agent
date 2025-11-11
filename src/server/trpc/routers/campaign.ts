import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure, hasOrgAccess, hasOrgAdminAccess } from "../trpc";
import { TRPCError } from "@trpc/server";

export const campaignRouter = createTRPCRouter({
  // List all campaigns for user's organizations
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const orgIds = ctx.memberships.map((m) => m.organizationId);
      
      // If specific org requested, verify access
      if (input?.organizationId) {
        if (!hasOrgAccess(ctx.memberships, input.organizationId)) {
          throw new TRPCError({ 
            code: "FORBIDDEN",
            message: "You don't have access to this organization"
          });
        }
        
        return ctx.db.campaign.findMany({
          where: { organizationId: input.organizationId },
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: { calls: true, hypotheses: true },
            },
          },
        });
      }
      
      // Return campaigns from all user's orgs
      return ctx.db.campaign.findMany({
        where: { organizationId: { in: orgIds } },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { calls: true, hypotheses: true },
          },
        },
      });
    }),

  // Get a single campaign by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const campaign = await ctx.db.campaign.findFirst({
        where: { id: input.id },
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
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "Campaign not found"
        });
      }

      // Verify user has access to this campaign's org
      if (!hasOrgAccess(ctx.memberships, campaign.organizationId)) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "You don't have access to this campaign"
        });
      }

      return campaign;
    }),

  // Create a new campaign (admin only)
  create: adminProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1),
        category: z.string().min(1).default("Retail"),
        checklistId: z.string().min(1).optional().default("default"),
        promptTemplate: z.string().optional(),
        // New panel fields (optional)
        panel: z.object({
          companies: z.array(z.string()),
          regions: z.array(z.string()),
          size: z.number().optional(),
        }).optional(),
        cadence: z.string().optional().default("WEEKLY"),
        window: z.object({
          days: z.array(z.string()), // ["Mon", "Tue", "Wed", "Thu", "Fri"]
          start: z.string(), // "09:00"
          end: z.string(), // "17:00"
          tz: z.string(), // "America/Los_Angeles"
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user has admin access to this org
      if (!hasOrgAdminAccess(ctx.memberships, input.organizationId)) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "You don't have admin access to this organization"
        });
      }

      const { panel, cadence, window, ...baseData } = input;

      return ctx.db.campaign.create({
        data: {
          ...baseData,
          promptTemplate: input.promptTemplate || "Default retail interview script",
          status: "DRAFT",
          // Store panel, cadence, window as JSON
          panel: panel ? panel as any : undefined,
          cadence: cadence || "WEEKLY",
          window: window ? window as any : undefined,
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

      // Fetch campaign to verify access
      const campaign = await ctx.db.campaign.findUnique({
        where: { id },
        select: { organizationId: true },
      });

      if (!campaign) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "Campaign not found"
        });
      }

      // Verify user has admin access
      if (!hasOrgAdminAccess(ctx.memberships, campaign.organizationId)) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "You don't have admin access to this campaign"
        });
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
      // Fetch campaign to verify access
      const campaign = await ctx.db.campaign.findUnique({
        where: { id: input.id },
        select: { organizationId: true },
      });

      if (!campaign) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "Campaign not found"
        });
      }

      // Verify user has admin access
      if (!hasOrgAdminAccess(ctx.memberships, campaign.organizationId)) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "You don't have admin access to this campaign"
        });
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
        where: { id: input.id },
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
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "Campaign not found"
        });
      }

      // Verify user has access
      if (!hasOrgAccess(ctx.memberships, campaign.organizationId)) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "You don't have access to this campaign"
        });
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

