import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "diligence-dialer",
  name: "Diligence Dialer",
});

// Event types
export type CallOrchestrateEvent = {
  name: "call/orchestrate";
  data: {
    callId: string;
    campaignId: string;
    phoneNumber: string;
  };
};

export type CallTranscribeEvent = {
  name: "call/transcribe";
  data: {
    callId: string;
    recordingUrl: string;
    recordingDualUrl?: string;
  };
};

export type ClaimExtractEvent = {
  name: "claim/extract";
  data: {
    callId: string;
    campaignId: string;
    transcript: string;
  };
};

export type ClaimValidateEvent = {
  name: "claim/validate";
  data: {
    hypothesisId: string;
    campaignId: string;
  };
};

export type InsightExportEvent = {
  name: "insight/export";
  data: {
    campaignId: string;
    integrationProvider: string;
  };
};

export type Events =
  | CallOrchestrateEvent
  | CallTranscribeEvent
  | ClaimExtractEvent
  | ClaimValidateEvent
  | InsightExportEvent;

