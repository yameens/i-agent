"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Play, Pause, Volume2, ExternalLink } from "lucide-react";
import { Signal } from "./signals-table";

interface EvidenceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signal: Signal | null;
  transcript?: Array<{
    speaker: "AI" | "HUMAN";
    text: string;
    timestamp: number;
  }>;
  isLoadingTranscript?: boolean;
}

export function EvidenceDrawer({
  open,
  onOpenChange,
  signal,
  transcript,
  isLoadingTranscript,
}: EvidenceDrawerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Reset audio when signal changes
  useEffect(() => {
    if (signal && audioRef.current) {
      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
      
      // Start at the evidence timestamp if available
      if (signal.timestamp > 0) {
        audio.currentTime = signal.timestamp;
      }
    }
    
    // Reset state after audio is updated
    return () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
  }, [signal]);

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "e" || e.key === "E") {
        // Don't trigger if user is typing in an input
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA"
        ) {
          return;
        }
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Find the relevant transcript section around the timestamp
  const getHighlightedTranscript = () => {
    if (!transcript || !signal) return [];

    const targetTime = signal.timestamp;
    const windowSize = 30; // seconds before and after

    return transcript.filter(
      (utterance) =>
        utterance.timestamp >= targetTime - windowSize &&
        utterance.timestamp <= targetTime + windowSize
    );
  };

  const highlightedTranscript = getHighlightedTranscript();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {!signal ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Select a signal to view evidence</p>
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="text-ink">Evidence</SheetTitle>
              <SheetDescription>
                Review the audio and transcript evidence for this signal
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Signal Details */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Claim
                  </h3>
                  <p className="text-sm text-ink">{signal.claim}</p>
                </div>

                <div className="flex gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Confidence
                    </h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium",
                        signal.confidence >= 0.8
                          ? "border-green-500 text-green-700 bg-green-50"
                          : signal.confidence >= 0.6
                          ? "border-yellow-500 text-yellow-700 bg-yellow-50"
                          : "border-gray-500 text-gray-700 bg-gray-50"
                      )}
                    >
                      {(signal.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      Status
                    </h3>
                    <Badge
                      className={cn(
                        signal.validated
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      {signal.validated ? "Validated" : "Pending"}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-4 text-sm">
                  {signal.sku && (
                    <div>
                      <span className="text-muted-foreground">SKU:</span>{" "}
                      <span className="text-ink font-medium">{signal.sku}</span>
                    </div>
                  )}
                  {signal.geo && (
                    <div>
                      <span className="text-muted-foreground">Geo:</span>{" "}
                      <span className="text-ink font-medium">{signal.geo}</span>
                    </div>
                  )}
                  {signal.field && (
                    <div>
                      <span className="text-muted-foreground">Field:</span>{" "}
                      <span className="text-ink font-medium">{signal.field}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Audio Player */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="h-4 w-4 text-brand" />
                  <h3 className="text-sm font-semibold text-ink">Audio Evidence</h3>
                </div>

                <audio
                  ref={audioRef}
                  src={signal.evidenceUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      onClick={togglePlayPause}
                      className="bg-brand hover:bg-brand/90"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>

                    <div className="flex-1">
                      <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand"
                      />
                    </div>

                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Evidence timestamp: {formatTime(signal.timestamp)}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(`/dashboard/calls/${signal.callId}`, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    View full call
                  </Button>
                </div>
              </div>

              {/* Transcript */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-ink mb-3">
                  Transcript Context
                </h3>

                {isLoadingTranscript ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                ) : highlightedTranscript.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No transcript available for this evidence.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {highlightedTranscript.map((utterance, idx) => {
                      const isNearEvidence =
                        Math.abs(utterance.timestamp - signal.timestamp) < 5;

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "p-3 rounded-lg transition-colors",
                            isNearEvidence
                              ? "bg-yellow-50 border border-yellow-200"
                              : "bg-muted/30"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                utterance.speaker === "AI"
                                  ? "border-brand text-brand"
                                  : "border-gray-500 text-gray-700"
                              )}
                            >
                              {utterance.speaker}
                            </Badge>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatTime(utterance.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-ink">{utterance.text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Keyboard Shortcut Hint */}
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                Press <kbd className="px-2 py-1 bg-muted rounded text-ink font-mono">E</kbd> to
                toggle this drawer
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

