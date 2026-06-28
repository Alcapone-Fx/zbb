# Balancr V2 — Design System Reference

> Personal Finance App (Zero-Based Budgeting). Mobile-first, deep navy dark theme, Spanish-language UI.
> Source of truth: `Balancr V2.dc.html`

---

## Typography

**Font family:** `Plus Jakarta Sans` (Google Fonts)
**Weights used:** 400, 500, 600, 700, 800

```
font-family: 'Plus Jakarta Sans', sans-serif;
```

### Type Scale

| Role | Size | Weight | Letter-spacing | Notes |
|---|---|---|---|---|
| Hero / TX amount | 52px | 800 | -2px | Transaction entry |
| Display | 40px | 800 | -2px | Net worth (Accounts screen) |
| Title large | 30px | 800 | -1.2px | MTA banner, login title |
| Available value | 28px | 800 | -1px | Per-category available balance |
| Screen heading | 22px | 800 | -0.5px | Tab screen titles |
| Card heading | 20px | 800 | -0.4px | Sheet/modal titles |
| Body large | 16px | 700–800 | — | Account balances |
| Body | 15px | 400–700 | — | Input text, profile name |
| Body default | 14px | 400–700 | — | List items, buttons |
| Body small | 13px | 400–600 | — | Descriptions, helper text |
| Caption | 12px | 400–700 | — | Sub-labels, dates, chart labels |
| Overline / label | 11px | 700 | 0.6–0.8px | Section headers (uppercase) |
| Micro | 10px | 700 | 0.5px | Nav tab labels, column headers (uppercase) |

**All numeric financial values use:** `font-variant-numeric: tabular-nums`

---

## Color System

### Backgrounds

```
Body page:       radial-gradient(ellipse at 50% -10%, #1C2848 0%, #08101E 65%)
App frame:       #0B1422   — main screen background / deep input fields
Surface/Card:    #111D32   — cards, nav bar, bottom sheets, list containers
Elevated:        #172B48   — input fields inside cards, focused edit areas, small stat cells
Screen header:   linear-gradient(180deg, #162240 0%, #0B1422 100%)  — top area of every screen
Login header:    linear-gradient(180deg, #131F38 0%, #0B1422 60%)
```

The header gradient (`#162240 → #0B1422`) is applied as a `background` on the top padding area of every tab screen. It gives depth to the status bar zone and transitions seamlessly into the main `#0B1422` scroll area.

### Text Colors

```
Primary:    #E0EDFF   — main text, values, headings (blue-white tint)
Secondary:  #6C8DB0   — subtitles, secondary labels, inactive states
Tertiary:   #335070   — meta text, column headers, inline labels, inactive nav icons
Muted:      #2E4D6E   — very faint labels, placeholders, helper text on login
Ghost:      #2A4060   — barely-visible micro text (account name in TX list)
```

### Semantic / Status Colors

```
Positive / income / available:  #34D399   — emerald green
Warning / caution:              #FBBF24   — amber
Negative / overspent / debt:    #F87171   — coral red
Accent alt / purple category:   #A78BFA   — lavender
Success deep:                   #22C55E   — used for the "12 months" tier in emergency fund
```

### Accent Themes (user-selectable, 3 options)

All accent-dependent styles reference four variables: `ac` (accent color), `ab` (tinted background), `aB` (border), `aShadow` (shadow/glow). Slightly stronger opacity than V1.

| Theme | Accent `ac` | Tinted bg `ab` | Border `aB` | Shadow `aShadow` |
|---|---|---|---|---|
| **Azul** (default) | `#4F6EF7` | `rgba(79,110,247,0.12)` | `rgba(79,110,247,0.25)` | `rgba(79,110,247,0.38)` |
| **Violeta** | `#8B5CF6` | `rgba(139,92,246,0.12)` | `rgba(139,92,246,0.25)` | `rgba(139,92,246,0.38)` |
| **Esmeralda** | `#10B981` | `rgba(16,185,129,0.12)` | `rgba(16,185,129,0.25)` | `rgba(16,185,129,0.38)` |

**Logo gradient:** `linear-gradient(145deg, {ac}, #1E3A8A)` — always anchors to a deep navy blue, regardless of theme.

### Borders

```
Standard card border:      1px solid rgba(255,255,255,0.08–0.09)
Input border (default):    1.5px solid rgba(255,255,255,0.09)
Input border (focused):    1.5px solid {ac}
Row divider inside card:   1px solid rgba(255,255,255,0.05)
Section divider:           1px solid rgba(255,255,255,0.06)
Off-budget row divider:    1px solid rgba(255,255,255,0.06)  (bare list, no card)
Dashed action border:      1px dashed {aB}
App frame outline:         0 0 0 1px rgba(255,255,255,0.1)
Accent card stripe (top):  border-top: 3px solid {ac}   — on highlighted helper cards
```

---

## Border Radius

```
App frame:         52px
Bottom sheet:      24px 24px 0 0
Large card:        18px–20px
Card:              14px–16px
Button primary:    14px–16px
Button secondary:  12px–14px
Input field:       12px–14px
Icon container:    10px–12px (34–38px squares)
Small icon bg:     10px
Logo mark:         26px
Tag / pill:        20px
Progress bar:      2px–7px
Inline dot:        2px
FAB:               18px
Segment tab inner: 9px (inside 12px radius container)
```

---

## Shadows

```
App frame:   0 40px 120px rgba(0,0,0,0.75),
             0 0 0 1px rgba(255,255,255,0.1),
             inset 0 1px 0 rgba(70,110,200,0.15)   ← blue-tinted inset, not white

FAB / CTA:   0 4px 28px {aShadow}
Logo icon:   0 12px 48px {aShadow}
```

---

## Spacing & Layout

### App Frame
- Size: `393px × 930px` (iPhone-like proportions)
- Screen top padding: `52px` (status bar area)
- Horizontal padding: `20px`
- Bottom nav height: `64px`

### Internal Spacing
```
Screen top padding (header area):  52px
Screen side padding:               20px
Section gap:                       10px–14px
Card internal padding:             14px–20px (commonly 16px–18px)
List row padding:                  13px–16px vertical, 14px–18px horizontal
Element gap (flex):                8px–14px
Input padding:                     12px–16px vertical, 14px–16px horizontal
```

### Key Grid Patterns
- **Budget table:** `flex` row — category name block (flex:1) + available value (min-width: 90px, text-right)
- **Dashboard stats:** `grid-template-columns: 1fr 1fr`
- **Helper list:** `grid-template-columns: 1fr 1fr`
- **Emergency fund tiers:** `grid-template-columns: 1fr 1fr 1fr 1fr`

---

## Components

### Cards
```css
/* Standard */
background: #111D32;
border-radius: 14px–16px;
border: 1px solid rgba(255,255,255,0.09);
padding: 16px–20px;

/* Highlighted (with accent top stripe) */
border-top: 3px solid {ac};

/* Elevated stat / metric */
background: #172B48;
border-radius: 12px;
padding: 14px–16px;
```

### Screen Header Area
Every tab screen wraps its title + controls in a top `div` with:
```css
padding: 52px 20px 14px–20px;
background: linear-gradient(180deg, #162240 0%, #0B1422 100%);
flex: none;   /* doesn't scroll */
```
The scrollable content area below it uses `background: #0B1422`.

### Buttons

**Primary (CTA):**
```css
background: {ac};
border: none;
border-radius: 14px–16px;
padding: 15px–17px;
font-size: 15px–16px;
font-weight: 700–800;
color: #fff;
box-shadow: 0 4px 28px {aShadow};
```

**Secondary (ghost):**
```css
background: rgba(255,255,255,0.04–0.06);
border: 1px solid rgba(255,255,255,0.08–0.09);
border-radius: 14px;
padding: 14px–15px;
font-size: 14px–15px;
font-weight: 600;
color: #6C8DB0;
```

**Accent tinted (add / action):**
```css
background: {ab};
border: 1px solid {aB};          /* solid for regular */
border: 1px dashed {aB};         /* dashed for "add new" */
border-radius: 12px–14px;
color: {ac};
font-weight: 700;
```

**Destructive:**
```css
background: rgba(248,113,113,0.08);
border: 1px solid rgba(248,113,113,0.2);
border-radius: 14px;
color: #F87171;
font-weight: 700;
```

**Segment / tab toggle:**
```css
/* Container */
background: #111D32;
border-radius: 12px;
padding: 4px;
gap: 2px;

/* Active */
background: {ac};
color: #fff;
border-radius: 9px;

/* Inactive */
background: transparent;
color: #335070;
```

**Filter chips (history):**
```css
/* Active */
background: {ac};
border: none;
border-radius: 20px;
padding: 7px 16px;
font-size: 12px;
font-weight: 700;
color: #fff;

/* Inactive */
background: #111D32;
border: 1px solid rgba(255,255,255,0.09);
color: #6C8DB0;
```

**Collapsible group header (budget):**
```css
cursor: pointer;
padding: 10px 4px 8px;
/* Shows collapse icon ▸ or ▾ in #335070 + group name in #6C8DB0 */
/* Total available amount right-aligned in status color */
/* 2px progress bar underneath group header */
```

**Helper list cards (data preview style):**
```css
background: #111D32;
border: 1px solid rgba(255,255,255,0.09);
border-radius: 16px;
padding: 18px 14px;
display: flex;
flex-direction: column;
gap: 8px;
/* Contains: title (14px/700/#E0EDFF), big stat number (26px/800/status-color), label (11px/#335070) */
/* Highlighted card adds border-top: 3px solid {ac} */
```

### Inputs

```css
/* Standard (login) */
background: rgba(255,255,255,0.05);
border: 1.5px solid rgba(255,255,255,0.09);
border-radius: 14px;
padding: 14px 16px;
font-size: 15px;
color: #E0EDFF;

/* Focus */
border-color: {ac};
background: rgba(255,255,255,0.08);

/* Inside card */
background: #0B1422;
border: 1.5px solid rgba(255,255,255,0.09);
border-radius: 12px;
padding: 12px–13px 14px;
font-size: 14px;
color: #E0EDFF;

/* Small settings input */
background: #172B48;
border: 1px solid rgba(255,255,255,0.09);
border-radius: 8px;
padding: 6px 8px;
font-size: 14px;
font-weight: 700;
width: 48px;
text-align: right;

/* Large hero input (TX amount) */
background: none;
border: none;
font-size: 52px;
font-weight: 800;
letter-spacing: -2px;
width: 200px;
text-align: center;
```

**Input label above:**
```css
font-size: 10px;
font-weight: 700;
letter-spacing: 0.5px;
color: #335070;
text-transform: uppercase;
margin-bottom: 6px;
```

Hide number spinners:
```css
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
input[type=number] { -moz-appearance: textfield; appearance: textfield; }
```

### Budget Row (V2-specific layout)

V2 replaces the 4-column table with a 2-column flex layout:

```
[dot] [name + inline assigned edit]   [available — large number]
```

```css
/* Row container */
display: flex;
align-items: center;
gap: 12px;
padding: 13px 14px;
border-bottom: 1px solid rgba(255,255,255,0.05);
position: relative;
overflow: hidden;

/* Left dot */
width: 3px; height: 38px; border-radius: 2px;
background: {ac} | #FBBF24 | #F87171;

/* Category name */
font-size: 14px; color: #BDD4F0; cursor: pointer;

/* Inline edit row (not-editing state) */
font-size: 11px; color: #335070;
/* e.g. "asig. $400 · -$280 ✎" */

/* Available — RIGHT column */
font-size: 28px; font-weight: 800; letter-spacing: -1px;
color: #34D399 | #F87171 | #335070;
text-align: right; min-width: 90px;

/* "disponible" label */
font-size: 10px; color: #335070; margin-top: 2px; letter-spacing: 0.3px;

/* Rollover indicator (when > 0) */
font-size: 10px; color: #6C8DB0; margin-top: 2px;
/* e.g. "↩ $150.00" */
```

### Inline Category Edit (active state)

Replaces the label row in-place:
```css
display: flex; align-items: center; gap: 5px;
/* Prefix span: "asig. $" in #335070 */
input: width:72px; background:#172B48; border:1px solid {ac};
       border-radius:6px; padding:3px 6px; font-size:12px; font-weight:700; color:#E0EDFF;
/* Suffix: "· -$xxx" in #335070 */
```

### Group Header (collapsible)

```css
/* Header row */
display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;
/* Left: collapse icon (▸/▾ in #335070) + group name (#6C8DB0, 12px/700) */
/* Right: total available in status color, 13px/800, tabular-nums */

/* Spend progress bar below header */
height: 2px; background: rgba(255,255,255,0.06); border-radius: 1px;
/* Fill: status color at opacity 0.5 */
```

### Icon Containers

```css
/* Accent (on-budget accounts, action icons) */
width: 38px; height: 38px;
background: {ab};
border-radius: 11px;

/* Profile avatar (settings) */
width: 48px; height: 48px;
background: {ab};
border: 1px solid {aB};
border-radius: 16px;

/* Semantic icon bg */
background: rgba(52,211,153,0.08);   /* green — off-budget/shield */
background: rgba(251,191,36,0.12);   /* amber — warnings, pending */
background: rgba(248,113,113,0.1);   /* red */
background: rgba(167,139,250,0.1);   /* purple */
```

### List Rows (inside cards)

```css
display: flex;
align-items: center;
gap: 12px;
padding: 13px–16px 16px–18px;
border-bottom: 1px solid rgba(255,255,255,0.05);
/* Last row: no border-bottom */
```

**Off-budget accounts (V2 bare list, no card wrapper):**
```css
/* No card background — rows sit directly on #0B1422 */
padding: 14px 0;
border-bottom: 1px solid rgba(255,255,255,0.06);
```

### Section Overline Labels

```css
font-size: 11px;
font-weight: 700;
letter-spacing: 0.8px;
color: #335070;
text-transform: uppercase;
margin-bottom: 10px–12px;
```

### Progress Bars

Standard (sinking funds, IVR):
```css
height: 8px;
background: #172B48;
border-radius: 4px;
overflow: hidden;
/* fill */
height: 100%;
width: {pct}%;
background: {ac} | #34D399 | #F87171;
border-radius: 4px;
opacity: 0.8;
```

Thin pace bar (dashboard):
```css
height: 4px;
background: rgba(255,255,255,0.06);
border-radius: 2px;
```

Category spend microbar (bottom of row):
```css
position: absolute;
bottom: 0; left: 0; right: 0;
height: 2px;
background: rgba(255,255,255,0.04);
/* fill */
height: 100%;
width: {spendPct};
background: {availColor};
opacity: 0.4;
transition: width 0.3s;
```

Group header bar (below group title):
```css
height: 2px;
background: rgba(255,255,255,0.06);
border-radius: 1px;
/* fill: status color at opacity 0.5 */
```

Emergency fund gradient bar:
```css
height: 14px;
background: #172B48;
border-radius: 7px;
overflow: hidden;
/* fill: linear-gradient(90deg, #F87171 0%, #FBBF24 35%, #34D399 65%) */
```

### FAB (Floating Action Button)

```css
position: absolute;
bottom: 82px; right: 20px;
width: 56px; height: 56px;
background: {ac};
border-radius: 18px;
box-shadow: 0 4px 28px {aShadow};
z-index: 30;
/* hover:  transform: scale(1.07) */
/* active: transform: scale(0.95) */
```

### Bottom Navigation Bar

```css
position: absolute;
bottom: 0; left: 0; right: 0;
height: 64px;
background: #111D32;
border-top: 1px solid rgba(255,255,255,0.08);
display: flex; align-items: center;
z-index: 20;
padding: 0 4px;

/* Each tab button */
flex: 1;
display: flex; flex-direction: column;
align-items: center; gap: 3px;
padding: 8px 4px;
font-size: 10px; font-weight: 700;

/* Active color: {ac} */
/* Inactive color: #335070 */
```

### Bottom Sheets (overlays)

```css
/* Backdrop */
position: absolute; inset: 0;
background: rgba(0,0,0,0.70–0.72);
z-index: 40–45;
display: flex; align-items: flex-end;

/* Sheet panel */
width: 100%;
background: #111D32;
border-radius: 24px 24px 0 0;
padding: 0 20px 40px;
animation: slideUp 0.32s cubic-bezier(0.34,1.2,0.64,1);

/* Drag handle */
width: 36px; height: 4px;
background: rgba(255,255,255,0.12);
border-radius: 2px;
margin: 14px auto 18px;
```

### Profile Card (Settings screen)

```css
display: flex; align-items: center; gap: 14px;
background: rgba(255,255,255,0.04);
border-radius: 16px;
padding: 14px;
border: 1px solid rgba(255,255,255,0.09);
```

### Dashboard Insights Banner

```css
background: #0E1B2E;
border-radius: 14px;
padding: 16px;
margin-bottom: 14px;

/* Status pill row */
display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
/* Dot: width:6px; height:6px; border-radius:50%; background: #34D399 | #F87171 */
/* Label: 11px/700, color matches dot, letter-spacing:0.3px */

/* Body text */
font-size: 14px; color: #BDD4F0; line-height: 1.55;

/* Alert sub-banner */
background: rgba(248,113,113,0.08);
border-radius: 10px;
padding: 10px 12px;
/* Dot: 5px, #F87171 */
/* Text: 12px/600, color: #F87171 */
```

### Category Trend Panel (V2-exclusive)

A bottom sheet triggered by tapping any category name. Contains:
- Section title (`18px/800/#E0EDFF`) + subtitle (`12px/#335070`)
- 6-month bar chart (assigned vs activity)
- `2×2` stat grid: "Promedio real (3m)" and "Mayor gasto" — `24px/800` values on `#0B1422` cells
- "Asignar promedio" primary button

### Scrollbar

```css
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.12);
  border-radius: 4px;
}
```

---

## Animations

```css
@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes fadeInUp {
  from { transform: translateY(14px); opacity: 0; }  /* 14px vs V1's 16px */
  to   { transform: translateY(0); opacity: 1; }
}
```

| Usage | Animation | Duration | Easing |
|---|---|---|---|
| Screen / overlay appear | `fadeIn` | 0.3s | ease |
| Sheet slide up | `slideUp` | 0.32s | cubic-bezier(0.34,1.2,0.64,1) — slight spring |
| Sub-view enter | `fadeInUp` | 0.3s | ease |
| Progress bars | `transition: width` | 0.3s | — |
| Segment tabs | `transition` omitted in V2 | — | — |

---

## App Navigation Structure

```
Login
└── Budget (default after login)
    ├── Pending Transactions overlay (shown once on first load)
    │
    ├── Budget  [tab 1]  ← collapsible groups, large available number, tap name → Trend panel
    ├── Accounts [tab 2]
    │   └── History (sub-page) ← transactions grouped by date
    ├── Dashboard [tab 3]  ← Insights banner + Pace widget + KPI grid + charts
    ├── Helpers [tab 4]  ← data-preview cards
    │   ├── Emergency Fund
    │   ├── Sinking Funds (Previsiones)
    │   ├── Super Calculator
    │   ├── Weekend Distributor
    │   └── Wishlist
    └── Settings [tab 5]  ← profile card + budget goals + emergency fund setting

Global overlays (z-index 30–50):
  • FAB → Add Transaction bottom sheet   (z:40)
  • Category Trend bottom sheet          (z:45)
  • Pending Transactions screen          (z:50)
```

---

## Semantic Color Usage Rules

| Scenario | Color |
|---|---|
| Available budget / income / positive | `#34D399` |
| Overspent / debt / negative | `#F87171` |
| Warning / at-risk / emergency amber | `#FBBF24` |
| Zero / neutral balance | `#335070` |
| Primary interactive (buttons, active nav, accent) | `{ac}` |
| Inactive / disabled | `#335070` |
| Priority High | `#F87171` |
| Priority Medium | `#FBBF24` |
| Category dot: healthy | `{ac}` |
| Category dot: near-empty (< 25% of assigned) | `#FBBF24` |
| Category dot: overspent | `#F87171` |

---

## Copywriting Style

- **Language:** Spanish (Latin America)
- **Tone:** Friendly, direct, confident — no emoji in UI
- **Numbers:** Always 2 decimal places, comma-thousands separator (`$1,473.28`)
- **Negative amounts:** `-$320.00` (dash before `$`)
- **Positive in TX history:** `+$2,800.00`
- **Dates:** Short `Jun 25`, `Jun 2027`. Relative: `Hoy`, `Ayer`
- **Section labels:** ALL CAPS, `letter-spacing: 0.8px`, `#335070`
- **Inline category row:** lowercase, e.g. `"asig. $400 · -$280 ✎"`
- **Insight copy:** narrative, 1–2 sentences, percentage bolded (`<strong>`)

---

## Key UX Patterns (V2-specific)

1. **Available-first budget:** The most prominent number in each category row is the **available balance** (`28px/800`). Assigned & activity are shown as a small inline label below the name.
2. **Inline editing in-place:** Tap the "asig. $xxx ✎" label → it morphs into a small input. Confirm with Enter or blur.
3. **Collapsible groups:** Tapping a group header toggles its categories. The header shows a ▸/▾ icon, the group's total available in status color, and a spend-progress bar.
4. **Category Trend Panel:** Tapping a category *name* (not the edit label) opens a bottom sheet with 6-month history, average spend, and a one-tap "assign average" action.
5. **Date-grouped transactions:** History screen groups transactions by date with relative labels ("Hoy", "Ayer", then explicit dates).
6. **Dashboard insights:** A narrative banner at the top summarizes financial health in plain language, with a color-coded status dot and optional alert pill.
7. **Pace widget:** Compares % of month elapsed vs % of budget used — if spending < elapsed %, it's a positive signal.
8. **Helper cards show live stats:** Instead of icons + descriptions (V1), helper grid cards preview the key number directly (e.g. "2.8 meses ahorrados").
9. **Theme switching:** 3 accent options (Azul, Violeta, Esmeralda). In V2 the switcher is *removed from Settings* — it only exists as a quick-toggle button on the Budget screen header.
10. **MTA banner:** Green (`#34D399`) when positive ("listo para asignar"), red (`#F87171`) when negative ("sobreasignado").
