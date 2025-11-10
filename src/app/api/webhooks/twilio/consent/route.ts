import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import twilio from "twilio";

export async function POST(request: NextRequest) {
  try {
    const callId = request.nextUrl.searchParams.get("callId");
    const formData = await request.formData();
    const speechResult = formData.get("SpeechResult")?.toString().toLowerCase();

    if (!callId) {
      return NextResponse.json({ error: "Missing callId" }, { status: 400 });
    }

    const call = await db.call.findUnique({
      where: { id: callId },
      include: {
        campaign: true,
      },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const twiml = new twilio.twiml.VoiceResponse();

    // Check if consent was given
    const consentGiven = speechResult?.includes("yes") || false;

    // Update call with consent
    await db.call.update({
      where: { id: callId },
      data: { consentGiven },
    });

    if (!consentGiven) {
      twiml.say(
        {
          voice: "Polly.Joanna",
        },
        "I understand. Thank you for your time. Goodbye."
      );
      twiml.hangup();
    } else {
      twiml.say(
        {
          voice: "Polly.Joanna",
        },
        "Thank you for your consent. Let's begin the channel check."
      );

      // Use the campaign's prompt template
      const questions = call.campaign.promptTemplate
        .split("\n")
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.replace(/^-\s*/, "").trim());

      // Ask each question
      for (const question of questions) {
        twiml.say({ voice: "Polly.Joanna" }, question);
        twiml.pause({ length: 5 });
      }

      twiml.say(
        {
          voice: "Polly.Joanna",
        },
        "Thank you for your time. This concludes our channel check. Goodbye."
      );
      twiml.hangup();
    }

    return new NextResponse(twiml.toString(), {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error: any) {
    console.error("Consent webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

