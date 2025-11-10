import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { getExportableClaims, claimsToCSV, claimsToJSON } from "@/lib/export";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaignId = request.nextUrl.searchParams.get("campaignId");
    const format = request.nextUrl.searchParams.get("format") || "csv";
    const validatedOnly =
      request.nextUrl.searchParams.get("validatedOnly") !== "false";

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 }
      );
    }

    // Verify user has access to this campaign through membership
    const membership = await db.membership.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        organizationId: membership.organizationId,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Get exportable claims
    const claims = await getExportableClaims(campaignId, validatedOnly);

    if (claims.length === 0) {
      return NextResponse.json(
        { error: "No claims to export" },
        { status: 404 }
      );
    }

    // Format and return
    if (format === "json") {
      const jsonData = claimsToJSON(claims);
      return new NextResponse(jsonData, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="claims-${campaignId}-${Date.now()}.json"`,
        },
      });
    } else {
      const csvData = claimsToCSV(claims);
      return new NextResponse(csvData, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="claims-${campaignId}-${Date.now()}.csv"`,
        },
      });
    }
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

