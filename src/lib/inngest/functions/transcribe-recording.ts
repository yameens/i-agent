import { inngest } from "../client";
import { db } from "@/server/db";
import { openaiClient } from "@/lib/openai";
import { NonRetriableError } from "inngest";

export const transcribeRecording = inngest.createFunction(
  {
    id: "transcribe-recording",
    name: "Transcribe Recording",
    retries: 3,
    idempotency: "event.data.callId", // Use callId for idempotency
    concurrency: {
      limit: 5, // Max 5 concurrent transcriptions
    },
  },
  { event: "call/transcribe" },
  async ({ event, step }) => {
    const { callId, recordingUrl, recordingDualUrl } = event.data;

    // Idempotency guard: Check if already transcribed
    const existingCall = await step.run("idempotency-check", async () => {
      return db.call.findUnique({
        where: { id: callId },
        select: {
          id: true,
          transcript: true,
          recordingUrl: true,
          _count: { select: { utterances: true } },
        },
      });
    });

    if (!existingCall) {
      throw new NonRetriableError(`Call ${callId} not found in database`);
    }

    // If already transcribed with utterances, skip
    if (existingCall.transcript && existingCall._count.utterances > 0) {
      return {
        success: true,
        callId,
        skipped: true,
        reason: "Call already transcribed",
        utteranceCount: existingCall._count.utterances,
      };
    }

    // Step 1: Download recording with retries
    const audioBuffer = await step.run(
      "download-recording",
      async () => {
        const urlToDownload = recordingDualUrl || recordingUrl;
        const response = await fetch(urlToDownload);

        if (!response.ok) {
          if (response.status === 404) {
            throw new NonRetriableError(
              `Recording not found at URL: ${urlToDownload}`
            );
          }
          throw new Error(
            `Failed to download recording: ${response.statusText}`
          );
        }

        const buffer = await response.arrayBuffer();

        // Validate file size (max 25MB for Whisper)
        if (buffer.byteLength > 25 * 1024 * 1024) {
          throw new NonRetriableError(
            `Recording file too large: ${buffer.byteLength} bytes (max 25MB)`
          );
        }

        return buffer;
      }
    );

    // Step 2: Transcribe with Whisper
    const transcription = await step.run(
      "transcribe-with-whisper",
      async () => {
        try {
          // Convert ArrayBuffer to File
          const audioFile = new File([audioBuffer as any], "recording.mp3", {
            type: "audio/mpeg",
          });

          const result = await openaiClient.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-1",
            response_format: "verbose_json",
            timestamp_granularities: ["word"],
            language: "en", // Specify language for better accuracy
          });

          return result;
        } catch (error: any) {
          console.error("Whisper transcription error:", error);

          // Check for non-retriable errors
          if (error.code === "invalid_file_format") {
            throw new NonRetriableError(
              `Invalid audio file format: ${error.message}`
            );
          }

          throw error;
        }
      }
    );

    // Step 3: Parse utterances with speaker diarization
    // Using pause-based heuristic for speaker changes
    // In production, consider using Deepgram or AssemblyAI for better diarization
    const utterances = await step.run("parse-utterances", async () => {
      const words = (transcription as any).words || [];

      if (words.length === 0) {
        throw new NonRetriableError(
          "No words found in transcription - recording may be silent"
        );
      }

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

      for (let i = 0; i < words.length; i++) {
        const word = words[i];

        if (wordCount === 0) {
          currentUtterance.timestamp = word.start || 0;
        }

        currentUtterance.text += (wordCount > 0 ? " " : "") + word.word;
        currentUtterance.confidence += word.confidence || 1.0;
        wordCount++;

        // End utterance on long pause (>1.5s) or end of words
        const nextWord = words[i + 1];
        const pause = nextWord ? nextWord.start - word.end : 999;

        if (pause > 1.5 || !nextWord) {
          if (wordCount > 0) {
            currentUtterance.confidence /= wordCount;
            utteranceList.push({ ...currentUtterance });
          }

          // Toggle speaker for next utterance
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

    // Step 4: Save transcript and utterances to database (atomic transaction)
    await step.run(
      "save-to-database",
      async () => {
        const fullTranscript = transcription.text;

        // Use transaction for atomicity
        await db.$transaction(async (tx) => {
          // Update call with transcript
          await tx.call.update({
            where: { id: callId },
            data: {
              transcript: fullTranscript,
              recordingUrl,
              recordingDualUrl,
            },
          });

          // Batch create utterances
          await tx.utterance.createMany({
            data: utterances.map((utterance) => ({
              callId,
              speaker: utterance.speaker,
              text: utterance.text,
              timestamp: utterance.timestamp,
              confidence: utterance.confidence,
            })),
            skipDuplicates: true, // Idempotency
          });
        });
      }
    );

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
      skipped: false,
    };
  }
);

