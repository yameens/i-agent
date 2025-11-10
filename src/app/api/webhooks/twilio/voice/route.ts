import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import twilio from "twilio";
import { verifyAndDeduplicateWebhook } from "@/lib/webhook-security";

export async function POST(request: NextRequest) {
  try {
    const callId = request.nextUrl.searchParams.get("callId");

    if (!callId) {
      return NextResponse.json({ error: "Missing callId" }, { status: 400 });
    }

    // Verify signature and check for duplicates
    const verification = await verifyAndDeduplicateWebhook(request, "voice");

    if (!verification.isValid) {
      console.error("Invalid Twilio signature for voice webhook");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    if (verification.isDuplicate) {
      console.log("Duplicate voice webhook event, ignoring");
      // Return success to acknowledge receipt but don't process
      return NextResponse.json({ success: true, duplicate: true });
    }

    // Fetch call and campaign
    const call = await db.call.findUnique({
      where: { id: callId },
      include: {
        campaign: true,
      },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Generate TwiML response
    const twiml = new twilio.twiml.VoiceResponse();

    // Greeting
    twiml.say(
      {
        voice: "Polly.Joanna",
      },
      "Hello, this is an automated channel check call from Diligence Dialer."
    );

    // Ask for consent
    twiml.say(
      {
        voice: "Polly.Joanna",
      },
      "Do you consent to being recorded? Please say yes or no."
    );

    // Gather consent response
    const gather = twiml.gather({
      input: ["speech"],
      timeout: 5,
      action: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/consent?callId=${callId}`,
      method: "POST",
    });

    // If no input, repeat
    twiml.say(
      {
        voice: "Polly.Joanna",
      },
      "I didn't hear a response. Please call back when you're ready. Goodbye."
    );
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error: any) {
    console.error("Voice webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

