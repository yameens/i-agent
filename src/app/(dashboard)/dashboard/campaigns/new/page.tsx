"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, X, Plus } from "lucide-react";
import Link from "next/link";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Retail");
  const [companies, setCompanies] = useState<string[]>([]);
  const [companyInput, setCompanyInput] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [regionInput, setRegionInput] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [promptTemplate, setPromptTemplate] = useState("");

  // Get first organization ID from user's memberships
  // In production, this would come from a context/hook
  const { data: campaigns } = trpc.campaign.list.useQuery();
  const firstOrgId = campaigns?.[0]?.organizationId;

  const createCampaign = trpc.campaign.create.useMutation({
    onSuccess: (data) => {
      router.push(`/dashboard/campaigns/${data.id}`);
    },
  });

  const handleAddCompany = () => {
    if (companyInput.trim() && !companies.includes(companyInput.trim())) {
      setCompanies([...companies, companyInput.trim()]);
      setCompanyInput("");
    }
  };

  const handleRemoveCompany = (company: string) => {
    setCompanies(companies.filter((c) => c !== company));
  };

  const handleAddRegion = () => {
    if (regionInput.trim() && !regions.includes(regionInput.trim())) {
      setRegions([...regions, regionInput.trim()]);
      setRegionInput("");
    }
  };

  const handleRemoveRegion = (region: string) => {
    setRegions(regions.filter((r) => r !== region));
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstOrgId) {
      alert("No organization found. Please contact support.");
      return;
    }

    createCampaign.mutate({
      name,
      category,
      organizationId: firstOrgId,
      panel: {
        companies,
        regions,
        size: companies.length + regions.length,
      },
      cadence: "WEEKLY",
      window: {
        days: selectedDays,
        start: startTime,
        end: endTime,
        tz: timezone,
      },
      promptTemplate: promptTemplate || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-brand-600 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </Link>
        <h1 className="text-3xl font-bold text-brand-950">Create Campaign</h1>
        <p className="text-muted-foreground mt-1">
          Set up a new automated retail interview campaign
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>
              Name your campaign and select a category
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Q4 Retail Pulse Check"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="E-commerce">E-commerce</SelectItem>
                  <SelectItem value="Supply Chain">Supply Chain</SelectItem>
                  <SelectItem value="Customer Service">Customer Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Panel Configuration */}
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Panel Configuration</CardTitle>
            <CardDescription>
              Define which companies and regions to target
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Companies */}
            <div className="space-y-2">
              <Label htmlFor="companies">Companies *</Label>
              <div className="flex gap-2">
                <Input
                  id="companies"
                  placeholder="e.g., Target, Walmart, Best Buy"
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCompany();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddCompany} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {companies.map((company) => (
                  <Badge key={company} variant="secondary" className="gap-1">
                    {company}
                    <button
                      type="button"
                      onClick={() => handleRemoveCompany(company)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {companies.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add at least one company to target
                </p>
              )}
            </div>

            {/* Regions */}
            <div className="space-y-2">
              <Label htmlFor="regions">Regions *</Label>
              <div className="flex gap-2">
                <Input
                  id="regions"
                  placeholder="e.g., California, Texas, Northeast"
                  value={regionInput}
                  onChange={(e) => setRegionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddRegion();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddRegion} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {regions.map((region) => (
                  <Badge key={region} variant="secondary" className="gap-1">
                    {region}
                    <button
                      type="button"
                      onClick={() => handleRemoveRegion(region)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {regions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add at least one region to target
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Cadence */}
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Weekly Cadence</CardTitle>
            <CardDescription>
              Configure when automated interviews run each week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cadence</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-brand-600 text-white">
                  WEEKLY
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Interviews run automatically every week
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Interview Days *</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={selectedDays.includes(day) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(day)}
                    className={
                      selectedDays.includes(day)
                        ? "bg-brand-600 hover:bg-brand-600/90 text-white"
                        : ""
                    }
                  >
                    {day}
                  </Button>
                ))}
              </div>
              {selectedDays.length === 0 && (
                <p className="text-xs text-destructive">
                  Select at least one day
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone *</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Interview Script */}
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Interview Script (Optional)</CardTitle>
            <CardDescription>
              Customize the interview questions and prompts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="promptTemplate">Script Template</Label>
              <textarea
                id="promptTemplate"
                className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md resize-y"
                placeholder="Leave blank to use the default retail interview script..."
                value={promptTemplate}
                onChange={(e) => setPromptTemplate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Default script will ask about inventory, pricing, promotions, and customer feedback
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="max-w-3xl">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Button
                type="submit"
                className="bg-brand-600 hover:bg-brand-600/90 text-white"
                disabled={
                  createCampaign.isPending ||
                  !name ||
                  companies.length === 0 ||
                  regions.length === 0 ||
                  selectedDays.length === 0
                }
              >
                {createCampaign.isPending ? "Creating..." : "Create Campaign"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Cancel
              </Button>
            </div>

            {createCampaign.error && (
              <div className="mt-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {createCampaign.error.message}
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
