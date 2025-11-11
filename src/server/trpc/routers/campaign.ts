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
        organizationId: z.string().optional(),
        name: z.string().min(1),
        category: z.string().default("Retail"),
        geos: z.string().optional(),
        skus: z.string().optional(),
        panelSize: z.number().optional(),
        weeklyCadence: z.string().optional().default("weekly"),
        notes: z.string().optional(),
        checklistId: z.string().optional().default("default"),
        promptTemplate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get organizationId from input or use first membership
      const organizationId = input.organizationId || ctx.memberships[0]?.organizationId;
      
      if (!organizationId) {
        throw new TRPCError({ 
          code: "BAD_REQUEST",
          message: "No organization found for user"
        });
      }

      // Verify user has admin access to this org
      if (!hasOrgAdminAccess(ctx.memberships, organizationId)) {
        throw new TRPCError({ 
          code: "FORBIDDEN",
          message: "You don't have admin access to this organization"
        });
      }

      // Parse comma-separated lists
      const geosList = input.geos 
        ? input.geos.split(',').map(g => g.trim()).filter(Boolean)
        : [];
      const skusList = input.skus 
        ? input.skus.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      // Build panel object
      const panel = {
        companies: [],
        regions: geosList,
        size: input.panelSize || 0,
      };

      return ctx.db.campaign.create({
        data: {
          organizationId,
          name: input.name,
          category: input.category,
          checklistId: input.checklistId || "default",
          promptTemplate: input.promptTemplate || input.notes || "Default retail interview script",
          status: "DRAFT",
          panel: panel as any,
          cadence: input.weeklyCadence?.toUpperCase() || "WEEKLY",
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

