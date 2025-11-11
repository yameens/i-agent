"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

export default function NewCampaignPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weeklyCadence, setWeeklyCadence] = useState("weekly");

  const createMutation = trpc.campaign.create.useMutation({
    onSuccess: (data) => {
      router.push(`/campaigns/${data.id}`);
    },
    onError: (err) => {
      setError(err.message || "Failed to create campaign");
      setPending(false);
    },
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const payload = {
      name: String(formData.get("name") || ""),
      category: String(formData.get("category") || "Retail"),
      geos: String(formData.get("geos") || ""),
      skus: String(formData.get("skus") || ""),
      panelSize: Number(formData.get("panelSize") || 0),
      weeklyCadence: weeklyCadence,
      notes: String(formData.get("notes") || ""),
    };

    // Validate required fields
    if (!payload.name) {
      setError("Campaign name is required");
      setPending(false);
      return;
    }

    try {
      // Use tRPC mutation
      await createMutation.mutateAsync(payload as any);
    } catch (err) {
      // Error handled by onError callback
      console.error("Create campaign error:", err);
    }
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="container mx-auto px-4 md:px-6 py-8">
        {/* Sticky Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/campaigns"
                className="text-muted-foreground hover:text-brand-600 transition-colors"
                aria-label="Back to campaigns"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-semibold text-brand-950">
                Create Campaign
              </h1>
            </div>
            <p className="text-sm text-neutral-600 ml-8">
              Configure a repeating panel for automated retail interviews.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/campaigns">Cancel</Link>
          </Button>
        </div>

        {/* Form Card */}
        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl shadow p-6 max-w-3xl mx-auto"
        >
          <div className="grid gap-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Campaign Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="e.g., Q4 Footwear Market Check"
                required
                aria-required="true"
                className="w-full"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Category
              </Label>
              <Input
                id="category"
                name="category"
                type="text"
                defaultValue="Retail"
                placeholder="Retail"
                className="w-full"
              />
            </div>

            {/* Geos */}
            <div className="space-y-2">
              <Label htmlFor="geos" className="text-sm font-medium">
                Geographies
              </Label>
              <Input
                id="geos"
                name="geos"
                type="text"
                placeholder="e.g., California, Texas, New York (comma-separated)"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Enter regions as a comma-separated list
              </p>
            </div>

            {/* SKUs */}
            <div className="space-y-2">
              <Label htmlFor="skus" className="text-sm font-medium">
                SKUs
              </Label>
              <Input
                id="skus"
                name="skus"
                type="text"
                placeholder="e.g., SKU-001, SKU-002, SKU-003 (comma-separated)"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Enter product SKUs as a comma-separated list
              </p>
            </div>

            {/* Panel Size */}
            <div className="space-y-2">
              <Label htmlFor="panelSize" className="text-sm font-medium">
                Panel Size
              </Label>
              <Input
                id="panelSize"
                name="panelSize"
                type="number"
                min="0"
                defaultValue="0"
                placeholder="Number of contacts"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Target number of panel contacts
              </p>
            </div>

            {/* Weekly Cadence */}
            <div className="space-y-2">
              <Label htmlFor="weeklyCadence" className="text-sm font-medium">
                Interview Cadence
              </Label>
              <Select value={weeklyCadence} onValueChange={setWeeklyCadence}>
                <SelectTrigger id="weeklyCadence" className="w-full">
                  <SelectValue placeholder="Select cadence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How often interviews will be conducted
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Additional campaign notes or instructions..."
                rows={4}
                className="w-full resize-none"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={pending}
              className="h-10 rounded-lg px-4 bg-brand-600 hover:bg-brand-600/90 text-white w-full"
            >
              {pending ? "Creating…" : "Create Campaign"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

