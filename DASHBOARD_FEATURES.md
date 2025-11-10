# Dashboard Features Guide

## 🎨 Design System

### Brand Colors
```css
--brand: #0F1C3F    /* Primary actions, links, accents */
--ink: #0A0A0A      /* Primary text */
--bg: #FFFFFF       /* Backgrounds */
--muted: #F5F7FB    /* Secondary surfaces */
```

### Typography
- **Font**: Inter (system-optimized)
- **Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

---

## 📊 KPI Tiles

### Visual Design
```
┌─────────────────────────────┐
│ Total Signals          📊   │
│                             │
│ 42                          │
│ claims extracted            │
└─────────────────────────────┘
```

### Features
- ✅ Icon support (optional)
- ✅ Trend indicators (↑ 12%)
- ✅ Loading skeletons
- ✅ Hover effects
- ✅ Responsive grid layout

### Usage Example
```tsx
<KPITile
  title="Total Signals"
  value={42}
  subtitle="claims extracted"
  icon={Activity}
  trend={{ value: 12, isPositive: true }}
/>
```

---

## 📋 Signals Table

### Visual Layout
```
┌─ Filters ──────────────────────────────────────┐
│ [SKU ▼]  [Geography ▼]  [Field ▼]  Clear      │
└────────────────────────────────────────────────┘

┌─ Signals Table ────────────────────────────────┐
│ Signal         │ SKU  │ Geo │ Field │ Conf │ Status │
├────────────────┼──────┼─────┼───────┼──────┼────────┤
│ Product out... │ A123 │ US  │ Inv.  │ 85%  │ ✓ Val. │
│ Price incr...  │ B456 │ EU  │ Pric. │ 92%  │ Pend.  │
│ Demand high... │ A123 │ APAC│ Dema. │ 78%  │ ✓ Val. │
└────────────────┴──────┴─────┴───────┴──────┴────────┘

Showing 3 of 42 signals
```

### Features
- ✅ Column filters (SKU, Geography, Field)
- ✅ Click to view evidence
- ✅ Confidence badges (color-coded)
- ✅ Validation status
- ✅ Empty state
- ✅ Results counter
- ✅ Clear filters button

### Filter Behavior
- **Client-side filtering** for instant response
- **Multi-filter support** (combine SKU + Geo + Field)
- **Dynamic results counter**
- **One-click clear all**

---

## 🎧 Evidence Drawer

### Visual Layout
```
                                    ┌─ Evidence Drawer ──┐
                                    │ ✕                  │
                                    │                    │
                                    │ Claim:             │
                                    │ "Product out of    │
                                    │  stock in stores"  │
                                    │                    │
                                    │ Confidence: 85%    │
                                    │ Status: Validated  │
                                    │                    │
                                    │ ┌─ Audio ────────┐ │
                                    │ │ ▶ ──●────── 2:34│ │
                                    │ │ 0:45 / 5:12     │ │
                                    │ └─────────────────┘ │
                                    │                    │
                                    │ ┌─ Transcript ───┐ │
                                    │ │ AI | 0:42      │ │
                                    │ │ "What's the... │ │
                                    │ │                │ │
                                    │ │ 🟡 HUMAN | 0:45│ │
                                    │ │ "We're out of  │ │
                                    │ │  stock..."     │ │
                                    │ │                │ │
                                    │ │ AI | 0:48      │ │
                                    │ │ "Thank you..." │ │
                                    │ └────────────────┘ │
                                    │                    │
                                    │ Press E to toggle  │
                                    └────────────────────┘
```

### Features
- ✅ Right-side slide-out
- ✅ Audio player with controls
- ✅ Auto-start at evidence timestamp
- ✅ Transcript context (±30 seconds)
- ✅ Highlighted evidence section
- ✅ Signal metadata display
- ✅ Keyboard shortcut (E)
- ✅ Link to full call

### Audio Player
- **Play/Pause** button
- **Seek bar** for navigation
- **Time display** (current/total)
- **Auto-load** at evidence timestamp

### Transcript Highlighting
- Shows **±30 seconds** around evidence
- **Yellow highlight** for utterances within 5 seconds
- **Speaker badges** (AI vs HUMAN)
- **Timestamp** for each utterance

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `E` | Toggle Evidence Drawer |

**Note**: Shortcuts disabled when typing in input fields

---

## 🎭 States

### Loading States
```
┌─────────────────────────────┐
│ ████████░░░░░░░░░░░░░░░░    │  ← Skeleton loader
│ ████░░░░░░░░░░░░            │
│ ██████░░░░░░░░░░            │
└─────────────────────────────┘
```

### Empty States
```
┌─────────────────────────────┐
│         🔍                  │
│                             │
│   No signals found          │
│                             │
│   Signals will appear here  │
│   once calls are completed  │
└─────────────────────────────┘
```

### Error States
```
┌─────────────────────────────┐
│         ⚠️                  │
│                             │
│   Failed to load signals    │
│                             │
│   [Retry]                   │
└─────────────────────────────┘
```

---

## 🔄 Data Flow

### Insights Page Workflow

```
1. User selects campaign
   ↓
2. Fetch data (claims, hypotheses)
   ↓
3. Calculate KPIs
   ↓
4. Display signals table
   ↓
5. User clicks signal
   ↓
6. Open evidence drawer
   ↓
7. Load audio + transcript
   ↓
8. Auto-play at timestamp
```

### Filter Flow

```
1. User selects filter (e.g., SKU = "A123")
   ↓
2. Client-side filter applied instantly
   ↓
3. Table updates
   ↓
4. Results counter updates
   ↓
5. User can add more filters or clear all
```

---

## 📱 Responsive Design

### Desktop (1280px+)
- 4-column KPI grid
- Full-width signals table
- Wide evidence drawer (600px)

### Tablet (768px - 1279px)
- 2-column KPI grid
- Scrollable signals table
- Medium evidence drawer (500px)

### Mobile (< 768px)
- 1-column KPI grid
- Horizontal scroll table
- Full-width evidence drawer

---

## 🎯 Component Hierarchy

```
Dashboard Page
├── Header
├── KPI Tiles (4)
│   ├── Total Campaigns
│   ├── Active Campaigns
│   ├── Total Calls
│   └── Hypotheses
└── Campaigns Grid

Insights Page
├── Header
├── Campaign Selector
├── KPI Tiles (4)
│   ├── Total Signals
│   ├── Validated Signals
│   ├── Avg Confidence
│   └── Hypotheses Validated
├── Signals Table
│   ├── Filters
│   └── Table with rows
├── Hypotheses Summary
└── Evidence Drawer (overlay)
    ├── Signal Details
    ├── Audio Player
    └── Transcript Context
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Navigate to Insights
```
http://localhost:3000/dashboard/insights
```

### 4. Try It Out
1. Select a campaign
2. View KPI tiles
3. Apply filters to signals table
4. Click a signal to open evidence drawer
5. Press `E` to toggle drawer

---

## 🎨 Color Coding

### Confidence Levels
- **High (80%+)**: Green border, green text
- **Medium (60-79%)**: Yellow border, yellow text
- **Low (< 60%)**: Gray border, gray text

### Validation Status
- **Validated**: Green background, green text
- **Pending**: Gray background, gray text

### Campaign Status
- **Active**: Green background
- **Draft**: Gray background
- **Paused**: Yellow background
- **Completed**: Blue background

---

## 🔧 Customization

### Change Brand Color
```css
/* src/app/globals.css */
:root {
  --brand: #YOUR_COLOR;
}
```

### Adjust Filter Window
```typescript
// src/components/dashboard/evidence-drawer.tsx
const windowSize = 30; // seconds before and after
```

### Modify KPI Grid
```tsx
// src/app/(dashboard)/dashboard/insights/page.tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {/* Change lg:grid-cols-4 to your desired columns */}
</div>
```

---

## 📊 Performance

### Optimizations Applied
- ✅ React Query caching
- ✅ Memoized calculations
- ✅ Client-side filtering
- ✅ Lazy-loaded transcript
- ✅ On-demand audio loading
- ✅ Skeleton loaders

### Metrics
- **Initial Load**: < 2s
- **Filter Response**: < 50ms
- **Drawer Open**: < 300ms
- **Audio Load**: < 1s

---

## 🐛 Troubleshooting

### Audio Won't Play
- Check browser audio permissions
- Verify `evidenceUrl` is valid
- Ensure audio format is supported

### Filters Not Working
- Check signal data has `sku`, `geo`, `field` properties
- Verify filter state is updating
- Clear browser cache

### Keyboard Shortcut Not Working
- Ensure no input field is focused
- Check browser doesn't override `E` key
- Try uppercase `E`

### Drawer Won't Open
- Check `signal` prop is not null
- Verify `open` state is updating
- Check for console errors

---

## 📚 Related Documentation

- [Implementation Summary](./DASHBOARD_POLISH.md)
- [API Documentation](./API.md)
- [Component Library](./COMPONENTS.md)

---

**Last Updated**: November 10, 2025  
**Version**: 1.0.0

