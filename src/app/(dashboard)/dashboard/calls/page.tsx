"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function CallsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const { data: campaigns } = trpc.campaign.list.useQuery();

  // For now, show all calls from all campaigns
  // In production, you'd add filtering by campaign

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Calls</h1>
        <p className="text-muted-foreground mt-1">
          View all channel-check calls across campaigns
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Select a campaign to view its calls, or navigate to a specific
            campaign page.
          </p>
          <div className="mt-4 space-y-2">
            {campaigns?.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/dashboard/campaigns/${campaign.id}`}
              >
                <Button variant="outline" className="w-full justify-start">
                  {campaign.name} ({campaign._count.calls} calls)
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

