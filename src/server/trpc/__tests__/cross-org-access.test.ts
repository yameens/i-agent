import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { campaignRouter } from "../routers/campaign";
import type { Context } from "../context";

// Mock database
const mockDb = {
  campaign: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  membership: {
    findMany: vi.fn(),
  },
};

describe("Cross-Organization Access Control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Campaign List", () => {
    it("should only return campaigns from user's organizations", async () => {
      const ctx: Context = {
        db: mockDb as any,
        user: { id: "user-1", email: "user@org1.com" } as any,
        memberships: [
          {
            organizationId: "org-1",
            organizationName: "Org 1",
            organizationSlug: "org-1",
            role: "MEMBER",
          },
        ],
      };

      mockDb.campaign.findMany.mockResolvedValue([
        { id: "campaign-1", organizationId: "org-1", name: "Campaign 1" },
      ]);

      const caller = campaignRouter.createCaller(ctx);
      const result = await caller.list();

      expect(mockDb.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: { in: ["org-1"] } },
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe("org-1");
    });

    it("should deny access when requesting campaigns from unauthorized org", async () => {
      const ctx: Context = {
        db: mockDb as any,
        user: { id: "user-1", email: "user@org1.com" } as any,
        memberships: [
          {
            organizationId: "org-1",
            organizationName: "Org 1",
            organizationSlug: "org-1",
            role: "MEMBER",
          },
        ],
      };

      const caller = campaignRouter.createCaller(ctx);

      await expect(
        caller.list({ organizationId: "org-2" })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("Campaign Get By ID", () => {
    it("should allow access to campaign in user's org", async () => {
      const ctx: Context = {
        db: mockDb as any,
        user: { id: "user-1", email: "user@org1.com" } as any,
        memberships: [
          {
            organizationId: "org-1",
            organizationName: "Org 1",
            organizationSlug: "org-1",
            role: "MEMBER",
          },
        ],
      };

      mockDb.campaign.findFirst.mockResolvedValue({
        id: "campaign-1",
        organizationId: "org-1",
        name: "Campaign 1",
        calls: [],
        hypotheses: [],
      });

      const caller = campaignRouter.createCaller(ctx);
      const result = await caller.getById({ id: "campaign-1" });

      expect(result.id).toBe("campaign-1");
      expect(result.organizationId).toBe("org-1");
    });

    it("should deny access to campaign in different org", async () => {
      const ctx: Context = {
        db: mockDb as any,
        user: { id: "user-1", email: "user@org1.com" } as any,
        memberships: [
          {
            organizationId: "org-1",
            organizationName: "Org 1",
            organizationSlug: "org-1",
            role: "MEMBER",
          },
        ],
      };

      mockDb.campaign.findFirst.mockResolvedValue({
        id: "campaign-2",
        organizationId: "org-2", // Different org!
        name: "Campaign 2",
        calls: [],
        hypotheses: [],
      });

      const caller = campaignRouter.createCaller(ctx);

      await expect(
        caller.getById({ id: "campaign-2" })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.getById({ id: "campaign-2" })
      ).rejects.toThrow("You don't have access to this campaign");
    });
  });

  describe("Campaign Create", () => {
    it("should allow admin to create campaign in their org", async () => {
      const ctx: Context = {
        db: mockDb as any,
        user: { id: "user-1", email: "admin@org1.com" } as any,
        memberships: [
          {
            organizationId: "org-1",
            organizationName: "Org 1",
            organizationSlug: "org-1",
            role: "ADMIN",
          },
        ],
      };

      mockDb.campaign.create.mockResolvedValue({
        id: "campaign-new",
        organizationId: "org-1",
        name: "New Campaign",
      });

      const caller = campaignRouter.createCaller(ctx);
      const result = await caller.create({
        organizationId: "org-1",
        name: "New Campaign",
        category: "Retail",
        checklistId: "checklist-1",
        promptTemplate: "Test prompt",
      });

      expect(result.organizationId).toBe("org-1");
    });

    it("should deny admin from creating campaign in different org", async () => {
      const ctx: Context = {
        db: mockDb as any,
        user: { id: "user-1", email: "admin@org1.com" } as any,
        memberships: [
          {
            organizationId: "org-1",
            organizationName: "Org 1",
            organizationSlug: "org-1",
            role: "ADMIN",
          },
        ],
      };

      const caller = campaignRouter.createCaller(ctx);

      await expect(
        caller.create({
          organizationId: "org-2", // Different org!
          name: "New Campaign",
          category: "Retail",
          checklistId: "checklist-1",
          promptTemplate: "Test prompt",
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.create({
          organizationId: "org-2",
          name: "New Campaign",
          category: "Retail",
          checklistId: "checklist-1",
          promptTemplate: "Test prompt",
        })
      ).rejects.toThrow("You don't have admin access to this organization");
    });

    it("should deny member from creating campaign", async () => {
      const ctx: Context = {
        db: mockDb as any,
        user: { id: "user-1", email: "member@org1.com" } as any,
        memberships: [
          {
            organizationId: "org-1",
            organizationName: "Org 1",
            organizationSlug: "org-1",
            role: "MEMBER", // Not admin!
          },
        ],
      };

      const caller = campaignRouter.createCaller(ctx);

      await expect(
        caller.create({
          organizationId: "org-1",
          name: "New Campaign",
          category: "Retail",
          checklistId: "checklist-1",
          promptTemplate: "Test prompt",
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.create({
          organizationId: "org-1",
          name: "New Campaign",
          category: "Retail",
          checklistId: "checklist-1",
          promptTemplate: "Test prompt",
        })
      ).rejects.toThrow("You must have admin or owner role to perform this action");
    });
  });

  describe("Campaign Update", () => {
    it("should deny update to campaign in different org", async () => {
      const ctx: Context = {
        db: mockDb as any,
        user: { id: "user-1", email: "admin@org1.com" } as any,
        memberships: [
          {
            organizationId: "org-1",
            organizationName: "Org 1",
            organizationSlug: "org-1",
            role: "ADMIN",
          },
        ],
      };

      mockDb.campaign.findUnique.mockResolvedValue({
        id: "campaign-2",
        organizationId: "org-2", // Different org!
      });

      const caller = campaignRouter.createCaller(ctx);

      await expect(
        caller.update({
          id: "campaign-2",
          name: "Updated Name",
        })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.update({
          id: "campaign-2",
          name: "Updated Name",
        })
      ).rejects.toThrow("You don't have admin access to this campaign");
    });
  });

  describe("Campaign Delete", () => {
    it("should deny delete of campaign in different org", async () => {
      const ctx: Context = {
        db: mockDb as any,
        user: { id: "user-1", email: "admin@org1.com" } as any,
        memberships: [
          {
            organizationId: "org-1",
            organizationName: "Org 1",
            organizationSlug: "org-1",
            role: "ADMIN",
          },
        ],
      };

      mockDb.campaign.findUnique.mockResolvedValue({
        id: "campaign-2",
        organizationId: "org-2", // Different org!
      });

      const caller = campaignRouter.createCaller(ctx);

      await expect(
        caller.delete({ id: "campaign-2" })
      ).rejects.toThrow(TRPCError);
      await expect(
        caller.delete({ id: "campaign-2" })
      ).rejects.toThrow("You don't have admin access to this campaign");
    });
  });

  describe("Multi-Organization User", () => {
    it("should allow access to campaigns from multiple orgs", async () => {
      const ctx: Context = {
        db: mockDb as any,
        user: { id: "user-1", email: "user@multi.com" } as any,
        memberships: [
          {
            organizationId: "org-1",
            organizationName: "Org 1",
            organizationSlug: "org-1",
            role: "MEMBER",
          },
          {
            organizationId: "org-2",
            organizationName: "Org 2",
            organizationSlug: "org-2",
            role: "ADMIN",
          },
        ],
      };

      mockDb.campaign.findMany.mockResolvedValue([
        { id: "campaign-1", organizationId: "org-1", name: "Campaign 1" },
        { id: "campaign-2", organizationId: "org-2", name: "Campaign 2" },
      ]);

      const caller = campaignRouter.createCaller(ctx);
      const result = await caller.list();

      expect(mockDb.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: { in: ["org-1", "org-2"] } },
        })
      );
      expect(result).toHaveLength(2);
    });
  });
});

