# Dashboard Components - Quick Reference

## 🚀 Import Statements

```typescript
// KPI Tiles
import { KPITile } from "@/components/dashboard/kpi-tile";

// Signals Table
import { SignalsTable, Signal } from "@/components/dashboard/signals-table";

// Evidence Drawer
import { EvidenceDrawer } from "@/components/dashboard/evidence-drawer";

// Or import all at once
import { KPITile, SignalsTable, EvidenceDrawer } from "@/components/dashboard";

// Icons
import { Activity, TrendingUp, CheckCircle2 } from "lucide-react";
```

---

## 📊 KPITile Component

### Basic Usage
```tsx
<KPITile
  title="Total Signals"
  value={42}
  subtitle="claims extracted"
/>
```

### With Icon
```tsx
<KPITile
  title="Total Signals"
  value={42}
  subtitle="claims extracted"
  icon={Activity}
/>
```

### With Trend
```tsx
<KPITile
  title="Total Signals"
  value={42}
  subtitle="claims extracted"
  icon={Activity}
  trend={{ value: 12, isPositive: true }}
/>
```

### Loading State
```tsx
<KPITile
  title="Total Signals"
  value={0}
  isLoading={true}
/>
```

### Props
```typescript
interface KPITileProps {
  title: string;              // Required: Tile title
  value: string | number;     // Required: Main value to display
  subtitle?: string;          // Optional: Subtitle text
  icon?: LucideIcon;          // Optional: Icon component
  trend?: {                   // Optional: Trend indicator
    value: number;            // Percentage value
    isPositive: boolean;      // Green (true) or red (false)
  };
  isLoading?: boolean;        // Optional: Show skeleton loader
  className?: string;         // Optional: Additional CSS classes
}
```

---

## 📋 SignalsTable Component

### Basic Usage
```tsx
const signals: Signal[] = [
  {
    id: "1",
    claim: "Product out of stock",
    confidence: 0.85,
    validated: true,
    timestamp: 45.2,
    callId: "call-123",
    phoneNumber: "+1234567890",
    evidenceUrl: "https://...",
  },
];

<SignalsTable
  signals={signals}
  onSignalClick={(signal) => console.log(signal)}
/>
```

### With Loading State
```tsx
<SignalsTable
  signals={[]}
  isLoading={true}
/>
```

### Signal Interface
```typescript
interface Signal {
  id: string;              // Unique identifier
  claim: string;           // Claim text
  sku?: string;            // Product SKU (for filtering)
  geo?: string;            // Geography (for filtering)
  field?: string;          // Custom field (for filtering)
  confidence: number;      // 0-1 confidence score
  validated: boolean;      // Validation status
  timestamp: number;       // Seconds from call start
  callId: string;          // Associated call ID
  phoneNumber: string;     // Phone number
  evidenceUrl: string;     // Audio URL
}
```

### Props
```typescript
interface SignalsTableProps {
  signals: Signal[];                    // Required: Array of signals
  onSignalClick?: (signal: Signal) => void;  // Optional: Click handler
  isLoading?: boolean;                  // Optional: Show skeleton loader
  className?: string;                   // Optional: Additional CSS classes
}
```

---

## 🎧 EvidenceDrawer Component

### Basic Usage
```tsx
const [isOpen, setIsOpen] = useState(false);
const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

<EvidenceDrawer
  open={isOpen}
  onOpenChange={setIsOpen}
  signal={selectedSignal}
/>
```

### With Transcript
```tsx
const transcript = [
  {
    speaker: "AI",
    text: "Hello, how can I help?",
    timestamp: 0,
  },
  {
    speaker: "HUMAN",
    text: "I need information about...",
    timestamp: 3.5,
  },
];

<EvidenceDrawer
  open={isOpen}
  onOpenChange={setIsOpen}
  signal={selectedSignal}
  transcript={transcript}
  isLoadingTranscript={false}
/>
```

### Props
```typescript
interface EvidenceDrawerProps {
  open: boolean;                        // Required: Drawer open state
  onOpenChange: (open: boolean) => void;  // Required: State setter
  signal: Signal | null;                // Required: Selected signal
  transcript?: Array<{                  // Optional: Transcript data
    speaker: "AI" | "HUMAN";
    text: string;
    timestamp: number;
  }>;
  isLoadingTranscript?: boolean;        // Optional: Loading state
}
```

---

## 🎨 Color Classes

### Text Colors
```tsx
className="text-ink"              // Primary text
className="text-muted-foreground" // Secondary text
className="text-brand"            // Brand color (links, accents)
```

### Background Colors
```tsx
className="bg-bg"                 // White background
className="bg-muted"              // Light gray surface
className="bg-brand"              // Brand background
```

### Border Colors
```tsx
className="border-border"         // Default border
className="border-brand"          // Brand border
```

---

## 🎯 Complete Example

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { 
  KPITile, 
  SignalsTable, 
  EvidenceDrawer,
  Signal 
} from "@/components/dashboard";
import { Activity, CheckCircle2 } from "lucide-react";

export default function InsightsPage() {
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: claims, isLoading } = trpc.insight.listValidatedClaims.useQuery({
    campaignId: "campaign-123",
  });

  const signals: Signal[] = claims?.map(claim => ({
    id: claim.id,
    claim: claim.text,
    confidence: claim.confidence,
    validated: claim.validated,
    timestamp: claim.timestamp,
    callId: claim.call.id,
    phoneNumber: claim.call.phoneNumber,
    evidenceUrl: claim.evidenceUrl,
  })) || [];

  const handleSignalClick = (signal: Signal) => {
    setSelectedSignal(signal);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPITile
          title="Total Signals"
          value={signals.length}
          subtitle="claims extracted"
          icon={Activity}
          isLoading={isLoading}
        />
        <KPITile
          title="Validated"
          value={signals.filter(s => s.validated).length}
          subtitle="triangulated"
          icon={CheckCircle2}
          isLoading={isLoading}
        />
      </div>

      {/* Signals Table */}
      <SignalsTable
        signals={signals}
        onSignalClick={handleSignalClick}
        isLoading={isLoading}
      />

      {/* Evidence Drawer */}
      <EvidenceDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        signal={selectedSignal}
      />
    </div>
  );
}
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action | Notes |
|-----|--------|-------|
| `E` | Toggle Evidence Drawer | Disabled when typing in input fields |

---

## 🎨 Styling Patterns

### Card with Brand Styling
```tsx
<Card className="bg-bg border-border hover:shadow-md transition-shadow">
  <CardHeader>
    <CardTitle className="text-ink">Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-muted-foreground">Content</p>
  </CardContent>
</Card>
```

### Button with Brand Color
```tsx
<Button className="bg-brand hover:bg-brand/90">
  Click Me
</Button>
```

### Badge with Confidence Color
```tsx
<Badge
  className={cn(
    confidence >= 0.8
      ? "border-green-500 text-green-700 bg-green-50"
      : confidence >= 0.6
      ? "border-yellow-500 text-yellow-700 bg-yellow-50"
      : "border-gray-500 text-gray-700 bg-gray-50"
  )}
>
  {(confidence * 100).toFixed(0)}%
</Badge>
```

---

## 🔧 Common Patterns

### Loading State
```tsx
{isLoading ? (
  <Skeleton className="h-10 w-full" />
) : (
  <div>Content</div>
)}
```

### Empty State
```tsx
{items.length === 0 ? (
  <div className="flex flex-col items-center gap-2 py-8">
    <Icon className="h-12 w-12 text-muted-foreground opacity-50" />
    <p className="text-sm text-muted-foreground">No items found</p>
  </div>
) : (
  <div>Items</div>
)}
```

### Conditional Rendering
```tsx
{selectedCampaign && (
  <div>Campaign content</div>
)}
```

---

## 📦 Dependencies

```json
{
  "@radix-ui/react-dialog": "^2.x",
  "@radix-ui/react-select": "^2.x",
  "lucide-react": "^0.x",
  "@tanstack/react-query": "^5.x"
}
```

---

## 🐛 Troubleshooting

### Issue: Filters not working
**Solution**: Ensure signal objects have `sku`, `geo`, and `field` properties.

### Issue: Audio won't play
**Solution**: Check that `evidenceUrl` is valid and accessible.

### Issue: Keyboard shortcut not working
**Solution**: Ensure no input field is focused. Try clicking outside inputs first.

### Issue: Drawer won't open
**Solution**: Verify `signal` is not null and `open` state is updating.

---

## 📚 Related Files

- **Components**: `src/components/dashboard/`
- **Pages**: `src/app/(dashboard)/dashboard/`
- **Styles**: `src/app/globals.css`
- **Types**: Defined inline in component files

---

**Last Updated**: November 10, 2025  
**Version**: 1.0.0

