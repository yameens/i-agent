import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: NextRequest) {
  try {
    const callId = request.nextUrl.searchParams.get("callId");
    const formData = await request.formData();
    const recordingUrl = formData.get("RecordingUrl")?.toString();
    const recordingSid = formData.get("RecordingSid")?.toString();

    if (!callId || !recordingUrl) {
      return NextResponse.json(
        { error: "Missing callId or recordingUrl" },
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

