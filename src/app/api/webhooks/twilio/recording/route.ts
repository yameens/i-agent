import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";
import { verifyAndDeduplicateWebhook } from "@/lib/webhook-security";

export async function POST(request: NextRequest) {
  try {
    const callId = request.nextUrl.searchParams.get("callId");

    if (!callId) {
      return NextResponse.json({ error: "Missing callId" }, { status: 400 });
    }

    // Verify signature and check for duplicates
    const verification = await verifyAndDeduplicateWebhook(
      request,
      "recording"
    );

    if (!verification.isValid) {
      console.error("Invalid Twilio signature for recording webhook");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    if (verification.isDuplicate) {
      console.log("Duplicate recording webhook event, ignoring");
      return NextResponse.json({ success: true, duplicate: true });
    }

    const formData = verification.formData!;
    const recordingUrl = formData.get("RecordingUrl")?.toString();
    const recordingSid = formData.get("RecordingSid")?.toString();

    if (!recordingUrl) {
      return NextResponse.json(
        { error: "Missing recordingUrl" },
        { status: 400 }
      );
    }

    // Construct full recording URL with auth
    const fullRecordingUrl = `${recordingUrl}.mp3`;

    // Trigger transcription via Inngest
    await inngest.send({
      name: "call/transcribe",
      data: {
        callId,
        recordingUrl: fullRecordingUrl,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Recording webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

