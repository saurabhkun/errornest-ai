# ErrorNest Design System

## Overview
ErrorNest is a premium observability and incident intelligence platform for modern product teams. The design language should feel calm, precise, and high-trust: technical enough for engineering workflows, yet polished enough for executive dashboards and investor-facing demos.

This system is designed for:
- Next.js 16
- Tailwind CSS v4
- shadcn/ui

The visual direction blends the clarity of Linear, the warmth of Vercel, the polish of Stripe, the seriousness of Sentry, and the delight of Raycast.

---

## 1. Brand Philosophy

ErrorNest should communicate three things at once:
- Confidence: the product feels reliable, fast, and deeply considered.
- Clarity: complex workflows should feel readable and controlled.
- Calm intelligence: the experience should feel thoughtful rather than noisy.

### Design principles
- Prioritize precision over decoration.
- Use restrained color and motion to emphasize signal.
- Let typography and spacing do the heavy lifting.
- Make errors feel understandable, not alarming.
- Create a premium experience through consistency, not visual clutter.

### Voice and tone in UI
- Clear and concise
- Calm and confident
- Action-oriented without being aggressive
- Friendly but never playful in a way that weakens trust

---

## 2. Typography Scale

### Font stack
- Display and UI: Inter
- Monospace and technical values: Geist Mono or JetBrains Mono

### Type scale
- Display 56 / 64: hero headings, key product statements
- Heading 1 40 / 48: page titles
- Heading 2 32 / 40: section titles
- Heading 3 24 / 32: card and panel titles
- Heading 4 20 / 28: sub-sections
- Body 16 / 24: primary content
- Body Small 14 / 20: supporting copy
- Caption 12 / 16: metadata, labels, helper text
- Label 11 / 16: UI labels, badges

### Type usage guidelines
- Use tighter tracking for uppercase labels and badges.
- Keep line lengths around 60–75 characters for body copy.
- Use semibold for interface hierarchy; avoid overuse of bold.
- Reserve monospace for hashes, IDs, timestamps, and code snippets.

---

## 3. Color Palette

### Core neutrals
- Background: #07111B
- Foreground: #F5F7FA
- Muted: #94A3B8
- Subtle: #64748B
- Border: #1F2A37
- Overlay: rgba(7, 17, 27, 0.72)

### Brand accents
- Primary: #5B8CFF
- Primary Hover: #4774E8
- Primary Soft: #DDE8FF
- Secondary: #7C3AED
- Secondary Soft: #E9DDFF

### Semantic colors
- Success: #22C55E
- Success Soft: #DDF8E7
- Warning: #F59E0B
- Warning Soft: #FFF1D6
- Danger: #EF4444
- Danger Soft: #FEE2E2
- Info: #3B82F6
- Info Soft: #DBEAFE

### Accent usage
- Use primary for key actions and active states.
- Use secondary sparingly for premium emphasis or feature highlights.
- Use semantic colors only for meaningful states, not purely decorative accents.

---

## 4. Surface Colors

Surfaces should feel layered and refined without becoming visually heavy.

- Canvas: #07111B
- Elevated: #0D1723
- Raised: #121D2D
- Panel: #0F1726
- Sidebar: #0A1220
- Input: #111C2B
- Hover: #16253B
- Active: #1D3047
- Contrast: #F8FAFC

### Surface rules
- Use elevation to separate data regions, not arbitrary color shifts.
- Keep surface contrast subtle and intentional.
- Avoid mixing too many bright colors on the same surface.

---

## 5. Semantic Colors

Semantic colors should be consistent across status, alerts, validation, and empty states.

- Success: trust, completed actions, healthy systems
- Warning: degraded health, caution, slow responses
- Danger: critical issues, failures, destructive actions
- Info: neutral learning states, hints, helpful context

### Guidance
- Pair each semantic color with a soft background and a strong foreground label.
- Keep danger states visually serious, not loud.
- Use semantic states only when the user needs to act or understand system health.

---

## 6. Spacing System

Use an 8px base grid.

- 0: 0px
- 1: 4px
- 2: 8px
- 3: 12px
- 4: 16px
- 5: 24px
- 6: 32px
- 7: 40px
- 8: 48px
- 9: 64px
- 10: 80px

### Spacing rules
- Stack content with 8px rhythm where possible.
- Use 16px spacing for most component padding.
- Use 24px–32px spacing for section separation.
- Keep dense dashboards structured with generous internal padding.

---

## 7. Border Radius

- None: 0px
- Sm: 6px
- Md: 8px
- Lg: 12px
- Xl: 16px
- 2XL: 20px
- Full: 999px

### Radius principles
- Use rounded corners for cards, inputs, and buttons.
- Keep tables and dense data surfaces slightly tighter.
- Use larger radii for floating surfaces and overlays.

---

## 8. Shadows

Shadows should feel soft and architectural, never heavy or dramatic.

- Shadow XS: 0 1px 2px rgba(2, 6, 23, 0.08)
- Shadow SM: 0 4px 10px rgba(2, 6, 23, 0.12)
- Shadow MD: 0 10px 24px rgba(2, 6, 23, 0.16)
- Shadow LG: 0 18px 40px rgba(2, 6, 23, 0.2)
- Shadow Glow: 0 0 0 1px rgba(91, 140, 255, 0.16), 0 12px 32px rgba(91, 140, 255, 0.18)

### Shadow usage
- Use shadows to imply depth, not to compensate for poor layout.
- Preserve a subtle and premium feel on dashboards.
- Use stronger shadows for modals, popovers, and command palettes.

---

## 9. Elevation System

### Elevation levels
- Level 0: flat surfaces, tables, page backgrounds
- Level 1: cards, sidebar panels, secondary containers
- Level 2: dropdowns, tooltips, small overlays
- Level 3: modals, drawers, side panels
- Level 4: command centers, immersive focus surfaces

### Elevation rules
- Elevation should be expressed through a combination of surface color, border, and shadow.
- Avoid stacking too many levels in a single view.
- Keep focus surfaces visually distinct and calm.

---

## 10. Icon Guidelines

### Icon style
- Use simple, rounded, geometric outline icons.
- Keep stroke weight consistent at 1.5px.
- Favor clarity and legibility over decorative detail.
- Icons should feel crisp in both light and dark themes.

### Recommended icon system
- Prefer Lucide for a modern, minimal interface.
- Use a consistent 20px base size for UI icons.
- Use 16px icons for dense tables and metadata rows.
- Use 24px icons for primary actions or hero illustrations.

### Icon usage rules
- Pair icons with labels when they may be ambiguous.
- Do not use too many icons in a single compact area.
- Use colored icons only when the semantic state is meaningful.

---

## 11. Motion Guidelines

Motion should be subtle, purposeful, and fast enough to feel fluid without being distracting.

### Timing
- Fast: 120ms
- Standard: 180ms
- Smooth: 240ms

### Easing
- Standard: cubic-bezier(0.2, 0.8, 0.2, 1)
- Enter: cubic-bezier(0.16, 1, 0.3, 1)
- Exit: cubic-bezier(0.4, 0, 0.2, 1)

### Motion principles
- Animate opacity, transform, and subtle elevation changes.
- Keep transitions crisp and polished.
- Avoid excessive bounce or dramatic entrance effects.
- Respect reduced-motion preferences.

---

## 12. Accessibility Guidelines

### Contrast
- Maintain WCAG AA contrast for text and interactive controls.
- Avoid relying on color alone to communicate meaning.

### Focus states
- Use a clear focus ring with strong contrast.
- Ensure focus states are visible across all interactive elements.

### Keyboard and interaction
- Ensure all key workflows are keyboard accessible.
- Maintain logical tab order and visible focus states.
- Support screen readers with semantic headings, labels, and ARIA patterns where needed.

### Motion and readability
- Respect reduced motion settings.
- Keep components readable at small sizes and across zoom levels.
- Ensure touch targets are at least 44px in size.

---

## Implementation Notes for Next.js 16 + Tailwind CSS v4 + shadcn/ui

- Define design tokens in Tailwind CSS v4 theme layers for colors, spacing, radius, and shadows.
- Use shadcn/ui primitives as the foundation for cards, inputs, dialogs, and menus.
- Keep component styling consistent through semantic tokens rather than ad hoc values.
- Favor minimal, editorial layouts with strong visual hierarchy.
- Use dark-mode-first surfaces for a premium technical aesthetic.
