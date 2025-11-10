import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/server/db";

/**
 * Verifies the X-Twilio-Signature header to ensure the webhook is from Twilio
 * @param request - The Next.js request object
 * @param body - The raw body string or parsed form data
 * @returns true if signature is valid, false otherwise
 */
export async function verifyTwilioSignature(
  request: NextRequest,
  body: string | FormData
): Promise<boolean> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("TWILIO_AUTH_TOKEN not configured");
    return false;
  }

  const signature = request.headers.get("X-Twilio-Signature");
  if (!signature) {
    console.error("Missing X-Twilio-Signature header");
    return false;
  }

  // Get the full URL
  const url = request.url;

  // Convert body to string for signature verification
  let bodyString: string;
  if (typeof body === "string") {
    bodyString = body;
  } else {
    // Convert FormData to URL-encoded string in sorted order (Twilio's format)
    const params = new URLSearchParams();
    body.forEach((value, key) => {
      params.append(key, value.toString());
    });
    bodyString = params.toString();
  }

  // Compute expected signature
  // Twilio concatenates URL + sorted params, then HMAC-SHA1 with auth token
  const data = url + bodyString;
  const expectedSignature = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Checks if a webhook event has already been processed
 * @param eventId - Unique identifier for the event (e.g., CallSid + event type)
 * @returns true if this is a new event, false if it's a duplicate
 */
export async function checkWebhookIdempotency(
  eventId: string
): Promise<boolean> {
  try {
    await db.webhookDedup.create({
      data: { id: eventId },
    });
    return true; // Successfully inserted, this is a new event
  } catch (error: any) {
    // Unique constraint violation means we've seen this event before
    if (error.code === "P2002") {
      console.log(`Duplicate webhook event detected: ${eventId}`);
      return false;
    }
    // Other errors should be thrown
    throw error;
  }
}

/**
 * Generates a unique event ID for webhook deduplication
 * @param callSid - Twilio CallSid
 * @param eventType - Type of webhook event (e.g., "voice", "status", "recording", "consent")
 * @param additionalId - Optional additional identifier (e.g., RecordingSid)
 * @returns Unique event ID
 */
export function generateWebhookEventId(
  callSid: string,
  eventType: string,
  additionalId?: string
): string {
  const parts = [callSid, eventType];
  if (additionalId) {
    parts.push(additionalId);
  }
  return parts.join(":");
}

/**
 * Parses FormData from a Twilio webhook request
 * @param request - The Next.js request object
 * @returns Parsed form data
 */
export async function parseTwilioWebhook(
  request: NextRequest
): Promise<FormData> {
  return await request.formData();
}

/**
 * Middleware to verify Twilio webhook signature and check idempotency
 * Returns null if verification passes, or a NextResponse with error if it fails
 */
export async function verifyAndDeduplicateWebhook(
  request: NextRequest,
  eventType: string
): Promise<{
  isValid: boolean;
  isDuplicate: boolean;
  formData: FormData | null;
  callSid: string | null;
}> {
  try {
    // Parse form data
    const formData = await parseTwilioWebhook(request);
    const callSid = formData.get("CallSid")?.toString() || null;

    if (!callSid) {
      return {
        isValid: false,
        isDuplicate: false,
        formData: null,
        callSid: null,
      };
    }

    // Verify signature
    const isValidSignature = await verifyTwilioSignature(request, formData);
    if (!isValidSignature) {
      return {
        isValid: false,
        isDuplicate: false,
        formData,
        callSid,
      };
    }

    // Check for duplicates
    const recordingSid = formData.get("RecordingSid")?.toString();
    const eventId = generateWebhookEventId(callSid, eventType, recordingSid);
    const isNewEvent = await checkWebhookIdempotency(eventId);

    return {
      isValid: true,
      isDuplicate: !isNewEvent,
      formData,
      callSid,
    };
  } catch (error) {
    console.error("Webhook verification error:", error);
    return {
      isValid: false,
      isDuplicate: false,
      formData: null,
      callSid: null,
    };
  }
}

