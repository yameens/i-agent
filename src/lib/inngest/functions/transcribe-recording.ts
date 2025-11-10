import { inngest } from "../client";
import { db } from "@/server/db";
import { openaiClient } from "@/lib/openai";

export const transcribeRecording = inngest.createFunction(
  {
    id: "transcribe-recording",
    name: "Transcribe Recording",
  },
  { event: "call/transcribe" },
  async ({ event, step }) => {
    const { callId, recordingUrl, recordingDualUrl } = event.data;

    // Step 1: Download recording
    const audioBuffer = await step.run("download-recording", async () => {
      const response = await fetch(recordingUrl);
      if (!response.ok) {
        throw new Error(`Failed to download recording: ${response.statusText}`);
      }
      return response.arrayBuffer();
    });

    // Step 2: Transcribe with Whisper
    const transcription = await step.run("transcribe-with-whisper", async () => {
      try {
        // Convert ArrayBuffer to File
        const audioFile = new File([audioBuffer], "recording.mp3", {
          type: "audio/mpeg",
        });

        const result = await openaiClient.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
          response_format: "verbose_json",
          timestamp_granularities: ["word"],
        });

        return result;
      } catch (error: any) {
        console.error("Whisper transcription error:", error);
        throw error;
      }
    });

    // Step 3: Parse utterances with speaker diarization
    // For now, we'll use a simple approach - alternate between AI and HUMAN
    // In production, you'd use a proper diarization service
    const utterances = await step.run("parse-utterances", async () => {
      const words = (transcription as any).words || [];
      const utteranceList: Array<{
        speaker: "AI" | "HUMAN";
        text: string;
        timestamp: number;
        confidence: number;
      }> = [];

      // Simple heuristic: group words into utterances by pauses
      let currentUtterance = {
        speaker: "AI" as "AI" | "HUMAN",
        text: "",
        timestamp: 0,
        confidence: 0,
      };
      let wordCount = 0;

      for (const word of words) {
        if (wordCount === 0) {
          currentUtterance.timestamp = word.start || 0;
        }

        currentUtterance.text += (wordCount > 0 ? " " : "") + word.word;
        currentUtterance.confidence += word.confidence || 1.0;
        wordCount++;

        // End utterance on long pause or end of words
        const nextWord = words[words.indexOf(word) + 1];
        const pause = nextWord ? nextWord.start - word.end : 999;

        if (pause > 1.5 || !nextWord) {
          currentUtterance.confidence /= wordCount;
          utteranceList.push({ ...currentUtterance });

          // Toggle speaker
          currentUtterance = {
            speaker: currentUtterance.speaker === "AI" ? "HUMAN" : "AI",
            text: "",
            timestamp: 0,
            confidence: 0,
          };
          wordCount = 0;
        }
      }

      return utteranceList;
    });

    // Step 4: Save transcript and utterances to database
    await step.run("save-to-database", async () => {
      const fullTranscript = transcription.text;

      await db.call.update({
        where: { id: callId },
        data: {
          transcript: fullTranscript,
          recordingUrl,
          recordingDualUrl,
        },
      });

      // Create utterances
      for (const utterance of utterances) {
        await db.utterance.create({
          data: {
            callId,
            speaker: utterance.speaker,
            text: utterance.text,
            timestamp: utterance.timestamp,
            confidence: utterance.confidence,
          },
        });
      }
    });

    // Step 5: Trigger claim extraction
    const call = await step.run("fetch-call", async () => {
      return db.call.findUnique({
        where: { id: callId },
        select: { campaignId: true, transcript: true },
      });
    });

    if (call?.transcript) {
      await step.sendEvent("trigger-claim-extraction", {
        name: "claim/extract",
        data: {
          callId,
          campaignId: call.campaignId,
          transcript: call.transcript,
        },
      });
    }

    return {
      success: true,
      callId,
      utteranceCount: utterances.length,
    };
  }
);

