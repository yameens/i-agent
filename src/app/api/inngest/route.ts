import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { orchestrateCall } from "@/lib/inngest/functions/orchestrate-call";
import { transcribeRecording } from "@/lib/inngest/functions/transcribe-recording";
import { extractClaims } from "@/lib/inngest/functions/extract-claims";
import { validateClaim } from "@/lib/inngest/functions/validate-claim";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    orchestrateCall,
    transcribeRecording,
    extractClaims,
    validateClaim,
  ],
});
