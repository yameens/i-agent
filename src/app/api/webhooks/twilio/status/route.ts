import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { verifyAndDeduplicateWebhook } from "@/lib/webhook-security";

export async function POST(request: NextRequest) {
  try {
    const callId = request.nextUrl.searchParams.get("callId");

    if (!callId) {
      return NextResponse.json({ error: "Missing callId" }, { status: 400 });
    }

    // Verify signature and check for duplicates
    const verification = await verifyAndDeduplicateWebhook(request, "status");

    if (!verification.isValid) {
      console.error("Invalid Twilio signature for status webhook");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    if (verification.isDuplicate) {
      console.log("Duplicate status webhook event, ignoring");
      return NextResponse.json({ success: true, duplicate: true });
    }

    const formData = verification.formData!;
    const callStatus = formData.get("CallStatus")?.toString();
    const callDuration = formData.get("CallDuration")?.toString();

    // Map Twilio status to our status
    let status: "QUEUED" | "RINGING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "NO_ANSWER" = "QUEUED";
    
    switch (callStatus) {
      case "queued":
        status = "QUEUED";
        break;
      case "ringing":
        status = "RINGING";
        break;
      case "in-progress":
        status = "IN_PROGRESS";
        break;
      case "completed":
        status = "COMPLETED";
        break;
      case "busy":
      case "failed":
        status = "FAILED";
        break;
      case "no-answer":
        status = "NO_ANSWER";
        break;
    }

    // Update call status
    await db.call.update({
      where: { id: callId },
      data: {
        status,
        duration: callDuration ? parseInt(callDuration) : undefined,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Status webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

