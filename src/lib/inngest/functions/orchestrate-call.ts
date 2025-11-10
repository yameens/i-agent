import { inngest } from "../client";
import { db } from "@/server/db";
import { twilioClient } from "@/lib/twilio";
import { NonRetriableError } from "inngest";

export const orchestrateCall = inngest.createFunction(
  {
    id: "orchestrate-call",
    name: "Orchestrate Call",
    retries: 3,
    idempotency: "event.data.callId", // Use callId for idempotency
    rateLimit: {
      limit: 10, // Max 10 concurrent calls
      period: "1m",
      key: "event.data.campaignId",
    },
  },
  { event: "call/orchestrate" },
  async ({ event, step }) => {
    const { callId, campaignId, phoneNumber } = event.data;

    // Idempotency guard: Check if call already processed
    const existingCall = await step.run("idempotency-check", async () => {
      return db.call.findUnique({
        where: { id: callId },
        select: { id: true, status: true, twilioSid: true },
      });
    });

    if (!existingCall) {
      throw new NonRetriableError(`Call ${callId} not found in database`);
    }

    // If call already has a Twilio SID and is in progress/completed, skip
    if (
      existingCall.twilioSid &&
      ["IN_PROGRESS", "COMPLETED", "FAILED"].includes(existingCall.status)
    ) {
      return {
        success: true,
        callId,
        twilioSid: existingCall.twilioSid,
        skipped: true,
        reason: "Call already processed",
      };
    }

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
      throw new NonRetriableError(`Campaign ${campaignId} not found`);
    }

    if (campaign.status !== "ACTIVE") {
      throw new NonRetriableError(
        `Campaign ${campaignId} is not active (status: ${campaign.status})`
      );
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

    // Step 3: Initiate Twilio call with retries
    const twilioCall = await step.run(
      "initiate-twilio-call",
      async () => {
        try {
          const call = await twilioClient.calls.create({
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER!,
            url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/voice?callId=${callId}`,
            statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status?callId=${callId}`,
            statusCallbackEvent: [
              "initiated",
              "ringing",
              "answered",
              "completed",
            ],
            record: true,
            recordingChannels: "dual",
            recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/recording?callId=${callId}`,
            timeout: 60, // Ring for 60 seconds
            machineDetection: "Enable",
            asyncAmd: "true",
          });

          return call;
        } catch (error: any) {
          console.error("Twilio call error:", error);

          // Mark as failed in DB for non-retriable errors
          if (error.code === 21211 || error.code === 21217) {
            // Invalid phone number or blocked number
            await db.call.update({
              where: { id: callId },
              data: { status: "FAILED" },
            });
            throw new NonRetriableError(
              `Invalid phone number: ${error.message}`
            );
          }

          // Retriable errors (network, rate limits, etc.)
          throw error;
        }
      }
    );

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

    // Step 5: Wait for call completion event (handled by webhooks)
    // Webhooks will trigger transcription when recording is ready

    return {
      success: true,
      callId,
      twilioSid: twilioCall.sid,
      skipped: false,
    };
  }
);

