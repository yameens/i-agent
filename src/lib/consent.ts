import { db } from "@/server/db";
import { twilioClient } from "./twilio";

/**
 * Check if a call has consent and handle redaction if needed
 */
export async function handleConsentRedaction(callId: string): Promise<void> {
  const call = await db.call.findUnique({
    where: { id: callId },
    select: {
      consentGiven: true,
      recordingUrl: true,
      twilioSid: true,
      transcript: true,
    },
  });

  if (!call) {
    throw new Error(`Call ${callId} not found`);
  }

  // If consent was not given, redact the recording and transcript
  if (!call.consentGiven) {
    console.log(`Redacting call ${callId} due to lack of consent`);

    // Delete recording from Twilio
    if (call.twilioSid) {
      try {
        const recordings = await twilioClient
          .recordings
          .list({ callSid: call.twilioSid });

        for (const recording of recordings) {
          await twilioClient.recordings(recording.sid).remove();
        }
      } catch (error) {
        console.error("Error deleting Twilio recording:", error);
      }
    }

    // Update database to remove sensitive data
    await db.call.update({
      where: { id: callId },
      data: {
        recordingUrl: null,
        recordingDualUrl: null,
        transcript: "[REDACTED - No consent given]",
      },
    });

    // Delete all utterances
    await db.utterance.deleteMany({
      where: { callId },
    });

    // Delete all claims
    await db.claim.deleteMany({
      where: { callId },
    });

    console.log(`Successfully redacted call ${callId}`);
  }
}

/**
 * Schedule consent redaction check (to be called 24 hours after call completion)
 */
export async function scheduleConsentCheck(callId: string): Promise<void> {
  // In production, this would schedule a job to run 24 hours later
  // For now, we'll just log it
  console.log(`Scheduled consent check for call ${callId} in 24 hours`);

  // TODO: Implement with Inngest scheduled function
  // await inngest.send({
  //   name: "consent/check",
  //   data: { callId },
  //   ts: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
  // });
}

/**
 * Detect consent from transcript
 */
export function detectConsentFromTranscript(transcript: string): boolean {
  const lowerTranscript = transcript.toLowerCase();

  // Positive consent indicators
  const positiveIndicators = [
    "yes",
    "sure",
    "okay",
    "ok",
    "i consent",
    "i agree",
    "go ahead",
    "that's fine",
  ];

  // Negative consent indicators
  const negativeIndicators = [
    "no",
    "don't",
    "do not",
    "i don't consent",
    "i don't agree",
    "stop recording",
  ];

  // Check for negative indicators first (they take precedence)
  for (const indicator of negativeIndicators) {
    if (lowerTranscript.includes(indicator)) {
      return false;
    }
  }

  // Check for positive indicators
  for (const indicator of positiveIndicators) {
    if (lowerTranscript.includes(indicator)) {
      return true;
    }
  }

  // Default to no consent if unclear
  return false;
}

