"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  Plug,
  Calendar,
  Phone,
  Brain,
  Table,
  Database,
} from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-brand-950">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization, team, and integrations
        </p>
      </div>

      {/* Organization */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-brand-600" />
            <div>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Manage your organization settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Organization Name</p>
            <p className="text-sm text-ink">Your Organization</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Plan</p>
            <Badge variant="outline">Free Trial</Badge>
          </div>
          <Button variant="outline" disabled>
            Edit Organization
          </Button>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-brand-600" />
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage who has access to your campaigns</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Invite team members to collaborate on campaigns and view insights.
          </p>
          <Button variant="outline" disabled>
            Invite Members
          </Button>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Plug className="h-5 w-5 text-brand-600" />
            <div>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect external services to Rondo</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Twilio */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Twilio</p>
                  <p className="text-xs text-muted-foreground">
                    PSTN voice calls and recording
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Connected
              </Badge>
            </div>

            {/* OpenAI */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">OpenAI</p>
                  <p className="text-xs text-muted-foreground">
                    GPT-4 signal extraction and Whisper transcription
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Connected
              </Badge>
            </div>

            {/* Google Sheets */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Table className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Google Sheets</p>
                  <p className="text-xs text-muted-foreground">
                    Export signals to spreadsheets
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>
                Connect
              </Button>
            </div>

            {/* Snowflake */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Snowflake</p>
                  <p className="text-xs text-muted-foreground">
                    Stream data to your data warehouse
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>
                Connect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-brand-600" />
            <div>
              <CardTitle>Weekly Schedules</CardTitle>
              <CardDescription>
                Configure when automated retail interviews run
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Set up weekly interview cycles using Inngest cron triggers. Each campaign can
            have its own schedule (e.g., Monday 9am org-local time).
          </p>
          <Button variant="outline" disabled>
            Configure Schedules
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

