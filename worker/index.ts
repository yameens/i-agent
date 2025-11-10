import express from "express";
import { serve } from "inngest/express";
import { inngest } from "../src/lib/inngest/client";
import { orchestrateCall } from "../src/lib/inngest/functions/orchestrate-call";
import { transcribeRecording } from "../src/lib/inngest/functions/transcribe-recording";
import { extractClaims } from "../src/lib/inngest/functions/extract-claims";
import { validateClaim } from "../src/lib/inngest/functions/validate-claim";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../.env" });

const app = express();
const PORT = process.env.WORKER_PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "diligence-dialer-worker" });
});

// Inngest endpoint
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [
      orchestrateCall,
      transcribeRecording,
      extractClaims,
      validateClaim,
    ],
  })
);

// Twilio webhook endpoints (proxied from main app)
app.post("/webhooks/twilio/voice", async (req, res) => {
  // Handle voice webhook
  console.log("Voice webhook received:", req.body);
  res.status(200).send("OK");
});

app.post("/webhooks/twilio/status", async (req, res) => {
  // Handle status webhook
  console.log("Status webhook received:", req.body);
  res.status(200).send("OK");
});

app.post("/webhooks/twilio/recording", async (req, res) => {
  // Handle recording webhook
  console.log("Recording webhook received:", req.body);
  res.status(200).send("OK");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Worker service running on port ${PORT}`);
  console.log(`📞 Twilio webhooks: http://localhost:${PORT}/webhooks/twilio/*`);
  console.log(`⚡ Inngest: http://localhost:${PORT}/api/inngest`);
});

