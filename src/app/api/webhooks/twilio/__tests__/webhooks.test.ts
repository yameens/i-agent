import { NextRequest } from "next/server";
import crypto from "crypto";
import { POST as voiceWebhook } from "../voice/route";
import { POST as statusWebhook } from "../status/route";
import { POST as recordingWebhook } from "../recording/route";
import { POST as consentWebhook } from "../consent/route";
import { db } from "@/server/db";
import { inngest } from "@/lib/inngest/client";

// Mock dependencies
jest.mock("@/server/db", () => ({
  db: {
    webhookDedup: {
      create: jest.fn(),
    },
    call: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: jest.fn(),
  },
}));

describe("Twilio Webhook Routes", () => {
  const TWILIO_AUTH_TOKEN = "test_auth_token_for_signature_verification";
  const BASE_URL = "https://test.example.com";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TWILIO_AUTH_TOKEN = TWILIO_AUTH_TOKEN;
    process.env.NEXT_PUBLIC_APP_URL = BASE_URL;
  });

  const createSignedRequest = (
    url: string,
    formData: FormData
  ): NextRequest => {
    const params = new URLSearchParams();
    formData.forEach((value, key) => {
      params.append(key, value.toString());
    });
    const bodyString = params.toString();
    const data = url + bodyString;
    const signature = crypto
      .createHmac("sha1", TWILIO_AUTH_TOKEN)
      .update(Buffer.from(data, "utf-8"))
      .digest("base64");

    const mockFormData = jest.fn().mockResolvedValue(formData);
    const request = new NextRequest(url, {
      method: "POST",
      headers: {
        "X-Twilio-Signature": signature,
      },
    });
    request.formData = mockFormData;

    return request;
  };

  describe("Voice Webhook", () => {
    const callId = "test-call-123";
    const url = `${BASE_URL}/api/webhooks/twilio/voice?callId=${callId}`;

    it("should reject request with invalid signature", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");

      const mockFormData = jest.fn().mockResolvedValue(formData);
      const request = new NextRequest(url, {
        method: "POST",
        headers: {
          "X-Twilio-Signature": "invalid_signature",
        },
      });
      request.formData = mockFormData;

      const response = await voiceWebhook(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toBe("Invalid signature");
    });

    it("should reject duplicate events", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");

      const request = createSignedRequest(url, formData);

      // Mock duplicate detection
      const error: any = new Error("Unique constraint failed");
      error.code = "P2002";
      (db.webhookDedup.create as jest.Mock).mockRejectedValue(error);

      const response = await voiceWebhook(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.duplicate).toBe(true);
    });

    it("should process valid voice webhook", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");

      const request = createSignedRequest(url, formData);

      (db.webhookDedup.create as jest.Mock).mockResolvedValue({
        id: "CA123:voice",
        receivedAt: new Date(),
      });

      (db.call.findUnique as jest.Mock).mockResolvedValue({
        id: callId,
        campaign: {
          id: "campaign-123",
          promptTemplate: "- Question 1\n- Question 2",
        },
      });

      const response = await voiceWebhook(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/xml");
    });

    it("should return 400 for missing callId", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");

      const urlWithoutCallId = `${BASE_URL}/api/webhooks/twilio/voice`;
      const request = createSignedRequest(urlWithoutCallId, formData);

      const response = await voiceWebhook(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe("Missing callId");
    });
  });

  describe("Status Webhook", () => {
    const callId = "test-call-123";
    const url = `${BASE_URL}/api/webhooks/twilio/status?callId=${callId}`;

    it("should reject request with invalid signature", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");
      formData.append("CallStatus", "completed");

      const mockFormData = jest.fn().mockResolvedValue(formData);
      const request = new NextRequest(url, {
        method: "POST",
        headers: {
          "X-Twilio-Signature": "invalid_signature",
        },
      });
      request.formData = mockFormData;

      const response = await statusWebhook(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toBe("Invalid signature");
    });

    it("should reject duplicate events", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");
      formData.append("CallStatus", "completed");

      const request = createSignedRequest(url, formData);

      const error: any = new Error("Unique constraint failed");
      error.code = "P2002";
      (db.webhookDedup.create as jest.Mock).mockRejectedValue(error);

      const response = await statusWebhook(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.duplicate).toBe(true);
    });

    it("should process valid status webhook and update call", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");
      formData.append("CallStatus", "completed");
      formData.append("CallDuration", "120");

      const request = createSignedRequest(url, formData);

      (db.webhookDedup.create as jest.Mock).mockResolvedValue({
        id: "CA123:status",
        receivedAt: new Date(),
      });

      (db.call.update as jest.Mock).mockResolvedValue({
        id: callId,
        status: "COMPLETED",
        duration: 120,
      });

      const response = await statusWebhook(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(db.call.update).toHaveBeenCalledWith({
        where: { id: callId },
        data: expect.objectContaining({
          status: "COMPLETED",
          duration: 120,
        }),
      });
    });
  });

  describe("Recording Webhook", () => {
    const callId = "test-call-123";
    const url = `${BASE_URL}/api/webhooks/twilio/recording?callId=${callId}`;

    it("should reject request with invalid signature", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");
      formData.append("RecordingUrl", "https://api.twilio.com/recording");
      formData.append("RecordingSid", "RE123");

      const mockFormData = jest.fn().mockResolvedValue(formData);
      const request = new NextRequest(url, {
        method: "POST",
        headers: {
          "X-Twilio-Signature": "invalid_signature",
        },
      });
      request.formData = mockFormData;

      const response = await recordingWebhook(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toBe("Invalid signature");
    });

    it("should reject duplicate events", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");
      formData.append("RecordingUrl", "https://api.twilio.com/recording");
      formData.append("RecordingSid", "RE123");

      const request = createSignedRequest(url, formData);

      const error: any = new Error("Unique constraint failed");
      error.code = "P2002";
      (db.webhookDedup.create as jest.Mock).mockRejectedValue(error);

      const response = await recordingWebhook(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.duplicate).toBe(true);
    });

    it("should process valid recording webhook and trigger Inngest", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");
      formData.append("RecordingUrl", "https://api.twilio.com/recording");
      formData.append("RecordingSid", "RE123");

      const request = createSignedRequest(url, formData);

      (db.webhookDedup.create as jest.Mock).mockResolvedValue({
        id: "CA123:recording:RE123",
        receivedAt: new Date(),
      });

      (inngest.send as jest.Mock).mockResolvedValue({ ids: ["event-123"] });

      const response = await recordingWebhook(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(inngest.send).toHaveBeenCalledWith({
        name: "call/transcribe",
        data: {
          callId,
          recordingUrl: "https://api.twilio.com/recording.mp3",
        },
      });
    });

    it("should return 400 for missing recordingUrl", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");
      formData.append("RecordingSid", "RE123");

      const request = createSignedRequest(url, formData);

      (db.webhookDedup.create as jest.Mock).mockResolvedValue({
        id: "CA123:recording:RE123",
        receivedAt: new Date(),
      });

      const response = await recordingWebhook(request);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe("Missing recordingUrl");
    });
  });

  describe("Consent Webhook", () => {
    const callId = "test-call-123";
    const url = `${BASE_URL}/api/webhooks/twilio/consent?callId=${callId}`;

    it("should reject request with invalid signature", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");
      formData.append("SpeechResult", "yes");

      const mockFormData = jest.fn().mockResolvedValue(formData);
      const request = new NextRequest(url, {
        method: "POST",
        headers: {
          "X-Twilio-Signature": "invalid_signature",
        },
      });
      request.formData = mockFormData;

      const response = await consentWebhook(request);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toBe("Invalid signature");
    });

    it("should reject duplicate events", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");
      formData.append("SpeechResult", "yes");

      const request = createSignedRequest(url, formData);

      const error: any = new Error("Unique constraint failed");
      error.code = "P2002";
      (db.webhookDedup.create as jest.Mock).mockRejectedValue(error);

      const response = await consentWebhook(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.duplicate).toBe(true);
    });

    it("should process consent given and return TwiML", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");
      formData.append("SpeechResult", "yes");

      const request = createSignedRequest(url, formData);

      (db.webhookDedup.create as jest.Mock).mockResolvedValue({
        id: "CA123:consent",
        receivedAt: new Date(),
      });

      (db.call.findUnique as jest.Mock).mockResolvedValue({
        id: callId,
        campaign: {
          id: "campaign-123",
          promptTemplate: "- Question 1\n- Question 2",
        },
      });

      (db.call.update as jest.Mock).mockResolvedValue({
        id: callId,
        consentGiven: true,
      });

      const response = await consentWebhook(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/xml");
      expect(db.call.update).toHaveBeenCalledWith({
        where: { id: callId },
        data: { consentGiven: true },
      });
    });

    it("should process consent denied and return TwiML", async () => {
      const formData = new FormData();
      formData.append("CallSid", "CA123");
      formData.append("SpeechResult", "no");

      const request = createSignedRequest(url, formData);

      (db.webhookDedup.create as jest.Mock).mockResolvedValue({
        id: "CA123:consent",
        receivedAt: new Date(),
      });

      (db.call.findUnique as jest.Mock).mockResolvedValue({
        id: callId,
        campaign: {
          id: "campaign-123",
          promptTemplate: "- Question 1\n- Question 2",
        },
      });

      (db.call.update as jest.Mock).mockResolvedValue({
        id: callId,
        consentGiven: false,
      });

      const response = await consentWebhook(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/xml");
      expect(db.call.update).toHaveBeenCalledWith({
        where: { id: callId },
        data: { consentGiven: false },
      });
    });
  });
});

