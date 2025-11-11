"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  // Mock org data - replace with actual data from context/tRPC
  const organizationName = "Rondo Demo Org";
  const organizationSlug = "rondo-demo";

  return (
    <div className="min-h-screen bg-muted">
      <div className="container mx-auto px-4 md:px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-brand-950">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization, integrations, and schedules
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="organization" className="w-full">
          <TabsList className="bg-white">
            <TabsTrigger value="organization">Organization</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="schedules">Schedules</TabsTrigger>
          </TabsList>

          {/* Organization Tab */}
          <TabsContent value="organization" className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-brand-950">Organization Details</CardTitle>
                <CardDescription>
                  View your organization information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={organizationName}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-slug">Organization Slug</Label>
                  <Input
                    id="org-slug"
                    value={organizationSlug}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in URLs and API calls
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm">Pro</Badge>
                    <span className="text-sm text-muted-foreground">
                      Unlimited campaigns and interviews
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-brand-950">Billing</CardTitle>
                <CardDescription>
                  Manage your subscription and payment methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="bg-brand-600 hover:bg-brand-600/90 text-white"
                  disabled
                >
                  Manage Billing (Coming Soon)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-brand-950">Connected Services</CardTitle>
                <CardDescription>
                  Connect Rondo with your existing tools and platforms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Salesforce */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-ink">Salesforce</p>
                      <p className="text-sm text-muted-foreground">
                        Sync signals to CRM records
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" disabled>
                    Connect
                  </Button>
                </div>

                {/* HubSpot */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-ink">HubSpot</p>
                      <p className="text-sm text-muted-foreground">
                        Push insights to marketing workflows
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" disabled>
                    Connect
                  </Button>
                </div>

                {/* Google Sheets */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-ink">Google Sheets</p>
                      <p className="text-sm text-muted-foreground">
                        Export signals to spreadsheets
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" disabled>
                    Connect
                  </Button>
                </div>

                {/* Snowflake */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-cyan-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-cyan-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-ink">Snowflake</p>
                      <p className="text-sm text-muted-foreground">
                        Stream data to your data warehouse
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" disabled>
                    Connect
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedules Tab */}
          <TabsContent value="schedules" className="space-y-6">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-brand-950">Weekly Panel Collection</CardTitle>
                <CardDescription>
                  Configure when automated retail interviews run
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 text-blue-600 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Automated Weekly Interviews
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Rondo runs automated retail interviews on a weekly cadence. 
                        Interview schedules are configured per campaign in the campaign settings.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Default Cadence</span>
                    <Badge variant="secondary">Weekly</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Interview Window</span>
                    <span className="text-sm font-medium text-ink">Mon-Fri, 9AM-5PM</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Timezone</span>
                    <span className="text-sm font-medium text-ink">America/Los_Angeles</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">Next Run</span>
                    <span className="text-sm font-medium text-ink">Monday, 9:00 AM</span>
                  </div>
                </div>

                <Button
                  className="bg-brand-600 hover:bg-brand-600/90 text-white"
                  disabled
                >
                  Configure Schedules (Coming Soon)
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-brand-950">CRON Configuration</CardTitle>
                <CardDescription>
                  Advanced scheduling options for developers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 border rounded-lg font-mono text-sm">
                  <p className="text-muted-foreground"># Weekly panel collection</p>
                  <p className="text-ink">0 9 * * 1-5</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Runs every weekday at 9:00 AM
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
