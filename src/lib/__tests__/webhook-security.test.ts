import { NextRequest } from "next/server";
import crypto from "crypto";
import {
  verifyTwilioSignature,
  checkWebhookIdempotency,
  generateWebhookEventId,
  verifyAndDeduplicateWebhook,
} from "../webhook-security";
import { db } from "@/server/db";

// Mock the database
jest.mock("@/server/db", () => ({
  db: {
    webhookDedup: {
      create: jest.fn(),
    },
  },
}));

describe("Webhook Security", () => {
  const TWILIO_AUTH_TOKEN = "test_auth_token_for_signature_verification";
  const TEST_URL = "https://test.example.com/api/webhooks/twilio/voice?callId=test123";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TWILIO_AUTH_TOKEN = TWILIO_AUTH_TOKEN;
  });

  describe("verifyTwilioSignature", () => {
    it("should return true for valid signature", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA1234567890abcdef");
      formData.append("From", "+15555555555");
      formData.append("To", "+15555555556");

      // Create the expected signature
      const params = new URLSearchParams();
      formData.forEach((value, key) => {
        params.append(key, value.toString());
      });
      const bodyString = params.toString();
      const data = TEST_URL + bodyString;
      const validSignature = crypto
        .createHmac("sha1", TWILIO_AUTH_TOKEN)
        .update(Buffer.from(data, "utf-8"))
        .digest("base64");

      const request = new NextRequest(TEST_URL, {
        method: "POST",
        headers: {
          "X-Twilio-Signature": validSignature,
        },
      });

      const result = await verifyTwilioSignature(request, formData);
      expect(result).toBe(true);
    });

    it("should return false for invalid signature", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA1234567890abcdef");

      const request = new NextRequest(TEST_URL, {
        method: "POST",
        headers: {
          "X-Twilio-Signature": "invalid_signature",
        },
      });

      const result = await verifyTwilioSignature(request, formData);
      expect(result).toBe(false);
    });

    it("should return false when signature header is missing", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA1234567890abcdef");

      const request = new NextRequest(TEST_URL, {
        method: "POST",
      });

      const result = await verifyTwilioSignature(request, formData);
      expect(result).toBe(false);
    });

    it("should return false when TWILIO_AUTH_TOKEN is not configured", async () => {
      delete process.env.TWILIO_AUTH_TOKEN;

      const formData = new FormData();
      formData.append("CallSid", "CA1234567890abcdef");

      const request = new NextRequest(TEST_URL, {
        method: "POST",
        headers: {
          "X-Twilio-Signature": "some_signature",
        },
      });

      const result = await verifyTwilioSignature(request, formData);
      expect(result).toBe(false);
    });

    it("should verify signature with string body", async () => {
      const bodyString = "CallSid=CA1234567890abcdef&From=%2B15555555555";
      const data = TEST_URL + bodyString;
      const validSignature = crypto
        .createHmac("sha1", TWILIO_AUTH_TOKEN)
        .update(Buffer.from(data, "utf-8"))
        .digest("base64");

      const request = new NextRequest(TEST_URL, {
        method: "POST",
        headers: {
          "X-Twilio-Signature": validSignature,
        },
      });

      const result = await verifyTwilioSignature(request, bodyString);
      expect(result).toBe(true);
    });
  });

  describe("checkWebhookIdempotency", () => {
    it("should return true for new event", async () => {
      (db.webhookDedup.create as jest.Mock).mockResolvedValue({
        id: "test-event-id",
        receivedAt: new Date(),
      });

      const result = await checkWebhookIdempotency("test-event-id");
      expect(result).toBe(true);
      expect(db.webhookDedup.create).toHaveBeenCalledWith({
        data: { id: "test-event-id" },
      });
    });

    it("should return false for duplicate event", async () => {
      const error: any = new Error("Unique constraint failed");
      error.code = "P2002";
      (db.webhookDedup.create as jest.Mock).mockRejectedValue(error);

      const result = await checkWebhookIdempotency("duplicate-event-id");
      expect(result).toBe(false);
    });

    it("should throw error for non-duplicate database errors", async () => {
      const error = new Error("Database connection failed");
      (db.webhookDedup.create as jest.Mock).mockRejectedValue(error);

      await expect(checkWebhookIdempotency("test-event-id")).rejects.toThrow(
        "Database connection failed"
      );
    });
  });

  describe("generateWebhookEventId", () => {
    it("should generate event ID with callSid and eventType", () => {
      const eventId = generateWebhookEventId("CA123", "voice");
      expect(eventId).toBe("CA123:voice");
    });

    it("should generate event ID with additional identifier", () => {
      const eventId = generateWebhookEventId("CA123", "recording", "RE456");
      expect(eventId).toBe("CA123:recording:RE456");
    });

    it("should handle different event types", () => {
      expect(generateWebhookEventId("CA123", "status")).toBe("CA123:status");
      expect(generateWebhookEventId("CA123", "consent")).toBe("CA123:consent");
    });
  });

  describe("verifyAndDeduplicateWebhook", () => {
    it("should return valid result for new webhook with valid signature", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA1234567890abcdef");
      formData.append("From", "+15555555555");

      const params = new URLSearchParams();
      formData.forEach((value, key) => {
        params.append(key, value.toString());
      });
      const bodyString = params.toString();
      const data = TEST_URL + bodyString;
      const validSignature = crypto
        .createHmac("sha1", TWILIO_AUTH_TOKEN)
        .update(Buffer.from(data, "utf-8"))
        .digest("base64");

      // Mock formData() to return our test data
      const mockFormData = jest.fn().mockResolvedValue(formData);
      const request = new NextRequest(TEST_URL, {
        method: "POST",
        headers: {
          "X-Twilio-Signature": validSignature,
        },
      });
      request.formData = mockFormData;

      (db.webhookDedup.create as jest.Mock).mockResolvedValue({
        id: "CA1234567890abcdef:voice",
        receivedAt: new Date(),
      });

      const result = await verifyAndDeduplicateWebhook(request, "voice");

      expect(result.isValid).toBe(true);
      expect(result.isDuplicate).toBe(false);
      expect(result.callSid).toBe("CA1234567890abcdef");
      expect(result.formData).toBeTruthy();
    });

    it("should return invalid for missing CallSid", async () => {
      const formData = new FormData();
      formData.append("From", "+15555555555");

      const mockFormData = jest.fn().mockResolvedValue(formData);
      const request = new NextRequest(TEST_URL, {
        method: "POST",
        headers: {
          "X-Twilio-Signature": "some_signature",
        },
      });
      request.formData = mockFormData;

      const result = await verifyAndDeduplicateWebhook(request, "voice");

      expect(result.isValid).toBe(false);
      expect(result.callSid).toBeNull();
    });

    it("should return invalid for bad signature", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA1234567890abcdef");

      const mockFormData = jest.fn().mockResolvedValue(formData);
      const request = new NextRequest(TEST_URL, {
        method: "POST",
        headers: {
          "X-Twilio-Signature": "invalid_signature",
        },
      });
      request.formData = mockFormData;

      const result = await verifyAndDeduplicateWebhook(request, "voice");

      expect(result.isValid).toBe(false);
    });

    it("should detect duplicate events", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA1234567890abcdef");

      const params = new URLSearchParams();
      formData.forEach((value, key) => {
        params.append(key, value.toString());
      });
      const bodyString = params.toString();
      const data = TEST_URL + bodyString;
      const validSignature = crypto
        .createHmac("sha1", TWILIO_AUTH_TOKEN)
        .update(Buffer.from(data, "utf-8"))
        .digest("base64");

      const mockFormData = jest.fn().mockResolvedValue(formData);
      const request = new NextRequest(TEST_URL, {
        method: "POST",
        headers: {
          "X-Twilio-Signature": validSignature,
        },
      });
      request.formData = mockFormData;

      // Mock duplicate detection
      const error: any = new Error("Unique constraint failed");
      error.code = "P2002";
      (db.webhookDedup.create as jest.Mock).mockRejectedValue(error);

      const result = await verifyAndDeduplicateWebhook(request, "voice");

      expect(result.isValid).toBe(true);
      expect(result.isDuplicate).toBe(true);
    });

    it("should handle recording webhooks with RecordingSid", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA1234567890abcdef");
      formData.append("RecordingSid", "RE9876543210fedcba");

      const params = new URLSearchParams();
      formData.forEach((value, key) => {
        params.append(key, value.toString());
      });
      const bodyString = params.toString();
      const data = TEST_URL + bodyString;
      const validSignature = crypto
        .createHmac("sha1", TWILIO_AUTH_TOKEN)
        .update(Buffer.from(data, "utf-8"))
        .digest("base64");

      const mockFormData = jest.fn().mockResolvedValue(formData);
      const request = new NextRequest(TEST_URL, {
        method: "POST",
        headers: {
          "X-Twilio-Signature": validSignature,
        },
      });
      request.formData = mockFormData;

      (db.webhookDedup.create as jest.Mock).mockResolvedValue({
        id: "CA1234567890abcdef:recording:RE9876543210fedcba",
        receivedAt: new Date(),
      });

      const result = await verifyAndDeduplicateWebhook(request, "recording");

      expect(result.isValid).toBe(true);
      expect(result.isDuplicate).toBe(false);
      expect(db.webhookDedup.create).toHaveBeenCalledWith({
        data: { id: "CA1234567890abcdef:recording:RE9876543210fedcba" },
      });
    });
  });
});

