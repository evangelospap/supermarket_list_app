---
name: Provisions & Pantry
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c2c9bb'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8c9387'
  outline-variant: '#42493e'
  surface-tint: '#a1d494'
  primary: '#a1d494'
  on-primary: '#0a3909'
  primary-container: '#2d5a27'
  on-primary-container: '#9dd090'
  inverse-primary: '#3b6934'
  secondary: '#ffb77d'
  on-secondary: '#4d2600'
  secondary-container: '#d97707'
  on-secondary-container: '#432100'
  tertiary: '#ffb3ad'
  on-tertiary: '#68000a'
  tertiary-container: '#a40217'
  on-tertiary-container: '#ffaea7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#bcf0ae'
  primary-fixed-dim: '#a1d494'
  on-primary-fixed: '#002201'
  on-primary-fixed-variant: '#23501e'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77d'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6e3900'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  numeric-data:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 16px
  gutter: 12px
  element-gap-xs: 4px
  element-gap-sm: 8px
  element-gap-md: 12px
  stack-margin: 16px
---

## Brand & Style
The design system is centered on high-efficiency household management. It prioritizes utility and speed over decorative elements, adopting a **Modern-Functional** aesthetic that leans into dark-mode ergonomics. The target audience consists of organized households and professional chefs who require a "heads-up display" for their inventory. 

The emotional response is one of calm control and reliability. By utilizing a "Dense Minimalist" approach, the UI allows for high information density without visual clutter, ensuring that grocery lists and expiration trackers are legible at a glance in various lighting conditions.

## Colors
This design system utilizes a layered dark-mode palette to establish hierarchy and depth. 

- **Backgrounds:** The base layer is a deep charcoal (#121212). Elevated surfaces use #1E1E1E (Cards) and #252525 (Modals/Overlays).
- **Actions:** Forest Green (#2D5A27) is reserved for primary confirmations and successful inventory additions.
- **Accents:** Warm Amber (#D97706) is used exclusively for low-stock warnings or status badges. Soft Red (#EF4444) identifies destructive actions or expired items.
- **Borders:** Thin, subtle slate (#333333) borders are the primary method for defining element boundaries, replacing shadows to maintain a clean, flat appearance.

## Typography
The system uses **Inter** exclusively to ensure maximum legibility at small sizes. 

- **Scale:** The scale is compact. We favor `body-md` (14px) for the majority of interface text to maintain density.
- **Contrast:** Pure white (#FFFFFF) is used for headlines, while a 70% opacity white (#B3B3B3) is used for secondary body text to reduce eye strain.
- **Numbers:** Tabular figures (`tnum`) should be enabled for all quantity steppers and inventory counts to ensure vertical alignment in lists.

## Layout & Spacing
The layout follows a **Fluid Grid** model with high density.

- **Grid:** A 12-column grid for desktop and a 4-column grid for mobile.
- **Rhythm:** A 4px baseline grid governs all spacing. Vertical rhythm is tight, with 12px margins between list items to maximize the number of items visible on screen.
- **Toolbars:** Sticky top and bottom bars provide immediate access to search and filtering, fixed to the viewport with a subtle #333333 bottom/top stroke.
- **Density:** Padding inside cards and list items is restricted to 12px horizontally and 8px vertically to favor data visibility over "breathing room."

## Elevation & Depth
This design system eschews traditional soft shadows in favor of **Tonal Layering** and **Low-Contrast Outlines**.

- **Level 0 (Background):** #121212.
- **Level 1 (Cards/Lists):** #1E1E1E with a 1px solid #333333 border.
- **Level 2 (Popovers/Modals):** #252525 with a 1px solid #444444 border and a tight 8px black shadow (0px 4px 8px rgba(0,0,0,0.5)).
- **Depth Perception:** Depth is communicated through color lightness—the higher the element "floats," the lighter the surface hex becomes.

## Shapes
Shapes are used to distinguish structural containers from interactive elements. 

- **Cards:** Use `rounded-lg` (16px) to create a distinct frame for content groups.
- **Buttons & Inputs:** Use `rounded-md` (12px). This slightly sharper radius differentiates interactive components from the larger layout containers.
- **Badges/Chips:** Use a full pill shape for status indicators (amber badges) to separate them from the rectangular nature of the inventory list.

## Components
- **Buttons:** Primary buttons are #2D5A27 with white text. Secondary buttons use a #333333 ghost style with a subtle border.
- **Compact List Items:** Items should feature a thumbnail on the left (40x40px), item name and subtext in the center, and a **Stepper Control** (minus/number/plus) on the right for immediate quantity adjustment.
- **Segmented Controls:** Used for switching views (e.g., "Pantry," "Fridge," "Freezer"). These should be flush-style with a #252525 background and a #333333 border.
- **Activity Feed:** A dense vertical timeline using `body-sm` text, highlighting recent additions or removals with 4px circular color dots (green for added, red for removed).
- **Input Fields:** Dark background (#121212) with a #333333 border that shifts to #2D5A27 on focus. Labels should be `label-caps` positioned above the input.
- **Sticky Toolbars:** Always present on mobile, housing the primary "Add Item" FAB (Floating Action Button) which is #2D5A27 and circular.