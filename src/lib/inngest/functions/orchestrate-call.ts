import { inngest } from "../client";
import { db } from "@/server/db";
import { twilioClient } from "@/lib/twilio";

export const orchestrateCall = inngest.createFunction(
  {
    id: "orchestrate-call",
    name: "Orchestrate Call",
  },
  { event: "call/orchestrate" },
  async ({ event, step }) => {
    const { callId, campaignId, phoneNumber } = event.data;

    // Step 1: Fetch campaign details
    const campaign = await step.run("fetch-campaign", async () => {
      return db.campaign.findUnique({
        where: { id: campaignId },
        include: {
          organization: true,
        },
      });
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    // Step 2: Update call status to RINGING
    await step.run("update-call-ringing", async () => {
      return db.call.update({
        where: { id: callId },
        data: {
          status: "RINGING",
          startedAt: new Date(),
        },
      });
    });

    // Step 3: Initiate Twilio call
    const twilioCall = await step.run("initiate-twilio-call", async () => {
      try {
        const call = await twilioClient.calls.create({
          to: phoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER!,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/voice?callId=${callId}`,
          statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status?callId=${callId}`,
          statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
          record: true,
          recordingChannels: "dual",
          recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/recording?callId=${callId}`,
        });

        return call;
      } catch (error: any) {
        console.error("Twilio call error:", error);
        throw error;
      }
    });

    // Step 4: Update call with Twilio SID
    await step.run("update-call-twilio-sid", async () => {
      return db.call.update({
        where: { id: callId },
        data: {
          twilioSid: twilioCall.sid,
          status: "IN_PROGRESS",
        },
      });
    });

    // Step 5: Wait for call completion (handled by webhooks)
    // The transcription will be triggered by the recording webhook

    return {
      success: true,
      callId,
      twilioSid: twilioCall.sid,
    };
  }
);

