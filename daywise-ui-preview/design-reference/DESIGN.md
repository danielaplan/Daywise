---
name: Daywise OS
colors:
  surface: '#f9f9f6'
  surface-dim: '#dadad7'
  surface-bright: '#f9f9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f1'
  surface-container: '#eeeeeb'
  surface-container-high: '#e8e8e5'
  surface-container-highest: '#e2e3e0'
  on-surface: '#1a1c1b'
  on-surface-variant: '#454651'
  inverse-surface: '#2f312f'
  inverse-on-surface: '#f1f1ee'
  outline: '#757682'
  outline-variant: '#c6c5d2'
  surface-tint: '#4959a4'
  primary: '#364790'
  on-primary: '#ffffff'
  primary-container: '#4f5faa'
  on-primary-container: '#dce0ff'
  inverse-primary: '#b9c3ff'
  secondary: '#585e71'
  on-secondary: '#ffffff'
  secondary-container: '#dce2f9'
  on-secondary-container: '#5e6477'
  tertiary: '#6f4200'
  on-tertiary: '#ffffff'
  tertiary-container: '#905700'
  on-tertiary-container: '#ffdcb9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b9c3ff'
  on-primary-fixed: '#001256'
  on-primary-fixed-variant: '#30418a'
  secondary-fixed: '#dce2f9'
  secondary-fixed-dim: '#c0c6dc'
  on-secondary-fixed: '#151b2c'
  on-secondary-fixed-variant: '#404659'
  tertiary-fixed: '#ffdcbb'
  tertiary-fixed-dim: '#ffb869'
  on-tertiary-fixed: '#2c1700'
  on-tertiary-fixed-variant: '#683d00'
  background: '#f9f9f6'
  on-background: '#1a1c1b'
  surface-variant: '#e2e3e0'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 3rem
    fontWeight: '600'
    lineHeight: 3.5rem
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.625rem
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: 0em
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.01em
  label-xs:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system embodies an intentional, calm, and distraction-free personal productivity operating system. Designed for high-agency knowledge workers, independent operators, and focused thinkers, the interface prioritizes psychological clarity over visual noise. 

The aesthetic is grounded in a refined, warm modern minimalism. It balances the precision of an operating system with the tactility of premium physical stationery. Visual hierarchy relies on whitespace, subtle boundary lines, and precise typography rather than heavy fills or aggressive visual cues. Color is used strictly as functional syntax: structural chrome remains quiet and warm, while priority accents guide task execution with immediate clarity. The experience feels grounding, unhurried, and deeply organized.

## Colors

The palette establishes an ambient, low-friction backdrop designed for long hours of focused work without ocular fatigue.

### Core Canvas & Structural Tiers
- **Canvas Base (`#FAFAF7`):** Warm alabaster white that softens glare across full-viewport layouts.
- **Card & Focus Surface (`#FFFFFF`):** Pure white designated exclusively for elevated work items, task cards, and modal canvases.
- **Subtle Surface (`#F3F4F6`):** Soft cool gray applied to structural sidebars, command bars, list hover states, and recessed panels.
- **Structural Boundary (`#E3E6EC`):** Crisp 1px division token for segmenting views and outlining cards.
- **Primary Text (`#202637`):** High-density deep charcoal, providing crisp contrast without the harshness of pure black.
- **Secondary / Supporting Text (`#64748B`):** Muted slate gray reserved for metadata, timestamps, and placeholder cues.

### Brand & Interactive Accent
- **Primary Accent (`#4F5FAA`):** Muted twilight indigo used for active navigational states, primary execution buttons, selection indicators, and timeline playheads.

### Semantic Priority & State Tokens
- **Priority High / Critical:** `#E05252` (Rose Crimson)
- **Priority Medium / Active:** `#E5983A` (Warm Amber)
- **Priority Low / Backlog:** `#3B82F6` (Focused Sky Blue)
- **Done / Resolved:** `#10B981` (Balanced Emerald)

## Typography

The typography scale utilizes **Inter** across all display, body, and micro-interface layers to maintain extreme structural consistency, dense information legibility, and architectural neutrality.

- **Numerics & Time Tracking:** Enable tabular figures (`tnum`) across time displays, calendar intervals, keyboard shortcuts, and quantitative metric counters.
- **Headlines:** Use slight negative tracking (`letterSpacing: -0.015em` to `-0.03em`) on titles to create an anchored editorial posture.
- **Contextual Micro-Labels:** `label-xs` utilizes uppercase styling and optical tracking (`+0.04em`) exclusively for status tags, keyboard shortcut chips, and section dividers.

## Layout & Spacing

The system runs on an 8pt architectural rhythm, with a 4pt sub-grid reserved for tight UI components (chips, badges, compact table cells).

### Spatial Organization
- **Desktop (1024px+):** Three-tier layout comprising a fixed navigational utility strip (64px or 240px collapsable), an agenda/timeline stage (fluid up to 1440px max-width), and an optional contextual drawer (380px fixed).
- **Tablet (768px - 1023px):** Sidebars collapse into overlay slide-overs or an icon rail. Main content conforms to an adaptive 8-column layout.
- **Mobile (<768px):** Single-column stack with persistent bottom action navigation, utilizing `margin-mobile` (16px) canvas boundaries.

### Alignment & Densities
- **Compact View:** Applied in high-volume timeline and Kanban boards; list items use `space-sm` vertical padding to maximize visible density.
- **Focus View:** Applied in single-task execution mode; wide card gutters (`space-xl`) with centered max-width (720px) eliminate ambient distraction.

## Elevation & Depth

This design system avoids theatrical 3D skeuomorphism and diffuse, colored drop-shadows. Depth is established through **tonal separation, crisp 1px borders, and restrained micro-shadows**.

- **Level 0 (Base Canvas):** `#FAFAF7` flat surface. Zero elevation.
- **Level 1 (Default Cards & Task Rows):** `#FFFFFF` background bound by a continuous `1px solid #E3E6EC` outline. Micro-shadow: `0px 1px 2px rgba(32, 38, 55, 0.04)`.
- **Level 2 (Hovered Cards & Actionable Modules):** `#FFFFFF` background with border `#D5D9E2`. Micro-shadow: `0px 2px 6px rgba(32, 38, 55, 0.06), 0px 1px 2px rgba(32, 38, 55, 0.03)`.
- **Level 3 (Flyouts, Command Palettes & Modals):** `#FFFFFF` background bound by `1px solid #E3E6EC`. Ambient structural drop: `0px 8px 24px rgba(32, 38, 55, 0.08), 0px 2px 6px rgba(32, 38, 55, 0.04)`.
- **Level -1 (Recessed Wells & Input Fields):** `#F3F4F6` flat background, inset or bordered by `1px solid #E3E6EC`. Conveys input readiness and compartmentalization.

## Shapes

The design system adopts a balanced geometry defined by tailored corner radii that convey modern approachability while retaining enterprise precision.

- **Cards & Primary Panels:** Use `rounded-xl` (1.5rem / 24px on large containers; 1rem / 16px on standard task cards) to visually frame tasks as cohesive islands.
- **Inputs & Action Buttons:** Use `0.5rem` (8px) for buttons, text fields, and dropdown targets.
- **Status Badges, Chips & Meta Tokens:** Use fully circular / pill geometry (`9999px`) to visually differentiate metadata tags from structural, squarer work items.

## Components

### Buttons
- **Primary:** Solid `#4F5FAA` fill, `#FFFFFF` text, `0.5rem` border radius, subtle hover transition to `#435194`. Active press scales down slightly (`0.98`).
- **Secondary / Subtle:** `#FFFFFF` fill with `1px solid #E3E6EC`, text `#202637`. On hover, background shifts to `#F3F4F6`.
- **Ghost:** Transparent background, `#64748B` text, shifting to `#F3F4F6` background and `#202637` text on hover.
- **Destructive:** Subtle `#FDF2F2` tinted background, `#E05252` text and border.

### Input Fields & Search Bars
- Background `#F3F4F6` in idle state; transitions to `#FFFFFF` with `1px solid #4F5FAA` and an outer halo of `0 0 0 3px rgba(79, 95, 170, 0.12)` upon focus. 
- Padding: `0.625rem 0.875rem` (`body-md`). Placeholder text styled in `#94A3B8`.

### Task & Work Item Cards
- Surfaces rendered in `#FFFFFF` with crisp `1px solid #E3E6EC` borders and `rounded-xl` corners.
- Interactive states: smooth border transition to `#D5D9E2` with Level 2 micro-shadow lift.
- Left-edge indicator: an optional 3px vertical pill indicator colored by semantic priority (`#E05252`, `#E5983A`, `#3B82F6`, or `#10B981`).

### Priority Chips & Tags
- Compact pill forms (`rounded-full`, vertical padding `0.125rem`, horizontal padding `0.5rem`).
- **High:** `#FDF2F2` background, `#E05252` text and 1px border.
- **Medium:** `#FEF7ED` background, `#E5983A` text and 1px border.
- **Low:** `#EFF6FF` background, `#3B82F6` text and 1px border.
- **Done:** `#ECFDF5` background, `#10B981` text and 1px border.

### Checkboxes & Selection Controls
- Checkbox container: `1.125rem` square with `0.25rem` radius, bordered in `1.5px solid #D1D5DB`.
- Checked state: `#10B981` solid fill with white checkmark icon, immediately striking through task typography with smooth 150ms ease.

### Command Palette (Spotlight K-Bar)
- Centered modal container (`640px` max-width), Level 3 elevation, `#FFFFFF` background with `1px solid #E3E6EC`.
- Integrated instant search input at `headline-md` size, separated by a crisp 1px rule from keyboard-navigable list items. Key command badges render in `#F3F4F6` with `0.25rem` radius and `label-xs` typography.