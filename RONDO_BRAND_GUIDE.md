# Rondo Brand Guide

Quick reference for maintaining brand consistency across the platform.

---

## 🎨 Brand Identity

### Name
**Rondo** (always capitalized, never "rondo" or "RONDO")

### Tagline
**Continuous Consumer Intelligence**

### Positioning
A SaaS platform for weekly automated retail interviews with evidence-linked insights.

---

## 🎨 Visual Design

### Color Palette

```css
/* Primary Brand Colors */
--brand-950: #0F1C3F;  /* Deep navy - primary brand, buttons, nav */
--brand-600: #1E2E6E;  /* Medium blue - hover states, links */
--brand: #0F1C3F;      /* Alias for primary (legacy support) */

/* Neutrals */
--ink: #0A0A0A;        /* Near-black - primary text */
--bg: #FFFFFF;         /* White - page background */
--muted: #F5F7FB;      /* Light gray - cards, surfaces */
```

### Typography

- **Font Family**: Inter (with system-ui fallback)
- **Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **Scale**: 12px, 14px, 16px, 20px, 24px, 32px, 40px
- **Line Heights**: 1.5 (body), 1.2 (headings)

### Spacing Scale

```css
/* Consistent spacing: 12/16/24 */
--spacing-xs: 12px;   /* Tight spacing */
--spacing-sm: 16px;   /* Default spacing */
--spacing-md: 24px;   /* Section spacing */
--spacing-lg: 32px;   /* Page spacing */
--spacing-xl: 48px;   /* Hero spacing */
```

### Design Principles

1. **Minimal borders**: Use subtle shadows instead
2. **Ample whitespace**: Let content breathe
3. **Clean hierarchy**: Clear visual structure
4. **Consistent spacing**: Use 12/16/24 scale

---

## 📝 Voice & Tone

### Brand Voice
- **Professional** but approachable
- **Confident** without being arrogant
- **Clear** and concise
- **Data-driven** but human

### Writing Style
- Use active voice
- Short sentences (< 20 words)
- Avoid jargon (unless industry-standard)
- Be specific, not vague

### Examples

✅ **Good**:
- "Schedule weekly interviews with your retail panel"
- "Extract structured signals from conversational data"
- "Validate insights across multiple sources"

❌ **Avoid**:
- "Leverage our AI-powered platform to synergize..."
- "Disrupt the market research industry with..."
- "Revolutionary paradigm shift in consumer intelligence..."

---

## 🗣️ Terminology

### Preferred Terms

| Use This | Not This |
|----------|----------|
| Rondo | Diligence Dialer |
| automated retail interviews | channel-check calls |
| panel | expert network |
| signals | claims (in UI) |
| continuous intelligence | ad-hoc research |
| weekly cadence | periodic checks |
| evidence-linked | evidence-based |
| retail contacts | experts |

### Code vs. UI

**In Code/Schema** (for stability):
- `Claim` (table/model name)
- `claims` (database table)
- `listValidatedClaims` (tRPC procedure)

**In UI/Copy** (user-facing):
- "Signals" (dashboard labels)
- "Validated signals" (KPI tiles)
- "Signal extraction" (process descriptions)

---

## 🎯 Messaging Framework

### Elevator Pitch (30 seconds)
"Rondo provides continuous consumer intelligence through weekly automated interviews with a persistent panel of retail contacts. We convert qualitative responses into structured signals, validate insights across multiple sources, and deliver evidence-linked trends through a clean dashboard."

### Value Propositions

1. **Continuous Intelligence**
   - Weekly automated cycles (not episodic)
   - Persistent panel relationships
   - Real-time trend detection

2. **Evidence-Linked Insights**
   - Every signal backed by audio evidence
   - Timestamped transcript references
   - Cross-source validation

3. **Retail-First Design**
   - SKU and geography tagging
   - Store manager/DTC ops focus
   - Category-agnostic framework

---

## 📱 UI Copy Guidelines

### Navigation
- **Primary Nav**: Campaigns, Calls, Insights, Settings
- **Brand Name**: "Rondo" (always visible in nav)

### Dashboard Headlines
- Use sentence case (not title case)
- Keep under 60 characters
- Be specific about action/outcome

**Examples**:
- ✅ "Manage your automated interview campaigns"
- ✅ "View validated signals and hypothesis analysis"
- ❌ "Manage Campaigns" (too vague)
- ❌ "VIEW ALL YOUR VALIDATED CLAIMS" (all caps, old term)

### Empty States
- Explain what's missing
- Suggest next action
- Keep encouraging tone

**Template**:
```
[Icon]
[Short explanation of what's empty]
[Specific next step]
[CTA Button]
```

### Error Messages
- Be specific about what went wrong
- Suggest how to fix it
- Avoid technical jargon

**Examples**:
- ✅ "We couldn't reach that phone number. Please check the number and try again."
- ❌ "Error: TWILIO_INVALID_NUMBER_FORMAT"

---

## 🔤 Capitalization Rules

### Always Capitalize
- Rondo (brand name)
- Organization names
- User names
- Campaign names

### Sentence Case
- Page titles
- Button labels
- Form labels
- Descriptions

### Title Case
- Navigation items
- Section headings
- Card titles

---

## 🎨 Component Patterns

### Buttons

**Primary** (brand color):
```tsx
<Button className="bg-brand hover:bg-brand/90">
  Create Campaign
</Button>
```

**Secondary** (outline):
```tsx
<Button variant="outline">
  Export CSV
</Button>
```

### Cards

**Standard**:
```tsx
<Card className="bg-bg border-border">
  <CardHeader>
    <CardTitle className="text-ink">Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### KPI Tiles

**Format**:
```tsx
<KPITile
  title="Total Signals"
  value={123}
  subtitle="extracted from interviews"
  icon={Activity}
/>
```

---

## 📊 Data Visualization

### Status Colors

```css
/* Success */
.status-validated { background: #10b981; color: white; }

/* Warning */
.status-pending { background: #f59e0b; color: white; }

/* Error */
.status-failed { background: #ef4444; color: white; }

/* Neutral */
.status-draft { background: #6b7280; color: white; }
```

### Confidence Scores

- **High** (≥80%): Green badge
- **Medium** (50-79%): Yellow badge
- **Low** (<50%): Red badge

---

## 🔊 Voice Experience

### Twilio Call Greeting

**Standard**:
```
"Hello, this is an automated retail interview from Rondo."
```

**Consent Request**:
```
"Do you consent to being recorded? Please say yes or no."
```

**Fallback**:
```
"I didn't hear a response. Please call back when you're ready. Goodbye."
```

---

## 📧 Email Templates

### Welcome Email

**Subject**: Welcome to Rondo

**Body**:
```
Hi [Name],

Welcome to Rondo! You're now set up to start gathering continuous consumer intelligence.

Here's what to do next:
1. Create your first campaign
2. Upload your retail panel contacts
3. Schedule your first weekly interview cycle

Need help? Reply to this email or visit our docs.

Best,
The Rondo Team
```

### Weekly Summary

**Subject**: Your weekly insights are ready

**Body**:
```
Hi [Name],

Your weekly interview cycle completed with [X] new signals.

Key highlights:
• [X] signals validated across multiple sources
• [X] new trends detected in [category]
• [X]% average confidence score

View full insights: [Dashboard Link]

Best,
The Rondo Team
```

---

## 🚀 Launch Checklist

When adding new features, ensure:

- [ ] Brand name is "Rondo" (not "Diligence Dialer")
- [ ] Uses correct terminology ("signals" not "claims" in UI)
- [ ] Follows color palette (--brand-950, --brand-600)
- [ ] Uses Inter font
- [ ] Sentence case for UI copy
- [ ] Empty states are helpful
- [ ] Error messages are clear
- [ ] Buttons use brand colors
- [ ] Spacing follows 12/16/24 scale

---

## 📚 Resources

### Design System
- **Tailwind Config**: `tailwind.config.ts`
- **Global Styles**: `src/app/globals.css`
- **Component Library**: `src/components/ui/`

### Brand Assets
- **Logo**: `/public/logo.svg` (to be added)
- **Favicon**: `/public/favicon.ico` (to be updated)
- **OG Image**: `/public/og-image.png` (to be added)

### Documentation
- **README**: Complete platform overview
- **REBRAND_CHANGELOG**: Full list of changes
- **BEFORE_AFTER**: Visual comparison

---

## 🤝 Contributing

When contributing to Rondo:

1. **Read this guide** before writing UI copy
2. **Use the terminology table** for consistency
3. **Follow the component patterns** for UI
4. **Test on mobile** (responsive design)
5. **Check accessibility** (WCAG 2.1 AA)

---

**Questions?** Open an issue or contact the design team.

---

**Last Updated**: November 11, 2025  
**Version**: 1.0.0

