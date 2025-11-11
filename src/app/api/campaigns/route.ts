import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/server/db";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization from membership
    const membership = await db.membership.findFirst({
      where: { userId: user.id },
      select: { organizationId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "User not found in any organization" },
        { status: 404 }
      );
    }

    // Verify user has admin access
    if (membership.role !== "ADMIN" && membership.role !== "OWNER") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      category = "Retail",
      geos = "",
      skus = "",
      panelSize = 0,
      weeklyCadence = "weekly",
      notes = "",
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Campaign name is required" },
        { status: 400 }
      );
    }

    // Parse comma-separated lists
    const geosList = geos
      ? geos.split(",").map((g: string) => g.trim()).filter(Boolean)
      : [];
    const skusList = skus
      ? skus.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    // Build panel object
    const panel = {
      companies: [],
      regions: geosList,
      size: Number(panelSize) || 0,
    };

    // Create campaign
    const campaign = await db.campaign.create({
      data: {
        organizationId: membership.organizationId,
        name,
        category,
        checklistId: "default",
        promptTemplate: notes || "Default retail interview script",
        status: "DRAFT",
        panel,
        cadence: weeklyCadence.toUpperCase(),
      },
    });

    return NextResponse.json({ id: campaign.id }, { status: 201 });
  } catch (error) {
    console.error("Create campaign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

