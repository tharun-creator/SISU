---
name: Booking AI Design System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464555'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 14px
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1200px
  gutter: 1.5rem
  margin-mobile: 1rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style
The design system is rooted in **Modern Minimalism**, prioritizing utility and cognitive ease over decorative elements. It evokes a sense of calm, intelligent assistance, positioning the AI as a high-performance tool rather than a toy. 

The aesthetic identity is defined by a "Content-First" philosophy:
- **Clarity:** Heavy use of whitespace to separate intents and data visualizations.
- **Precision:** Fine lines and intentional alignment that reflect the accuracy of the underlying AI.
- **Approachability:** While professional, the interface remains inviting through smooth transitions and a soft neutral palette, ensuring users feel supported throughout the booking journey.
- **High Utility:** Interaction patterns are optimized for speed, mimicking the efficiency of a command-line interface but with the elegance of a premium SaaS product.

## Colors
This design system utilizes a high-clarity light mode palette to maintain a professional, paper-like quality.

- **Primary (#4F46E5):** An electric indigo used exclusively for primary actions, focus states, and key data highlights. It serves as the "interactive thread" throughout the UI.
- **Neutrals:** A sophisticated range of Slate grays. 
    - `Slate-900 (#0F172A)` is used for primary headings to ensure accessibility.
    - `Slate-500 (#64748B)` is reserved for secondary metadata and helper text.
- **Surfaces:** Pure white (`#FFFFFF`) is used for the main canvas, while `Slate-50 (#F8FAFC)` provides subtle contrast for sidebar elements or nested containers.
- **Accents:** Success, warning, and error states should use desaturated versions of green, amber, and red to avoid breaking the minimalist harmony.

## Typography
The system employs a dual-font strategy to balance technical precision with readability.

- **Headlines & Labels (Geist):** Used for structural elements and UI controls. Its monolinear, slightly condensed nature gives the interface a modern, "dev-tool" aesthetic that feels efficient.
- **Body Text (Inter):** Used for all conversational AI output and detailed booking information. Inter’s tall x-height ensures maximum legibility during long reading sessions.
- **Scaling:** Headlines use tight tracking (letter-spacing) to appear cohesive, while labels use slight tracking increases to maintain clarity at small sizes.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. The main chat/booking interface is centered with a max-width of 800px to maintain focus, while dashboard views expand to a 12-column 1200px grid.

- **The 8px Rule:** All spacing increments are multiples of 8px (0.5rem) to ensure a consistent vertical rhythm.
- **Safe Margins:** A minimum of 24px (1.5rem) padding is maintained inside all cards and containers.
- **Mobile Reflow:** On mobile devices, the 2-column "Context + Chat" layout collapses into a single-column stack, with the navigation moving to a bottom bar or hidden drawer to maximize vertical space for the keyboard and conversation.

## Elevation & Depth
This design system avoids heavy shadows in favor of **Tonal Layers and Low-Contrast Outlines**.

- **Surfaces:** Depth is created primarily through color blocking (e.g., a `Slate-50` background with `White` cards).
- **Outlines:** Elements are defined by 1px borders in `Slate-200`. In dark mode or high-focus areas, these may be slightly emphasized.
- **Elevation:** When a physical sense of depth is required (such as a dropdown or a modal), a very soft, diffused shadow is used: `0 4px 12px rgba(0, 0, 0, 0.05)`.
- **Active State:** Focus is indicated by a 2px outer ring of the Primary color with an offset, rather than a change in surface elevation.

## Shapes
The shape language is "Softly Geometric." 

- **Corners:** A standard radius of `0.5rem (8px)` is applied to cards and input fields to balance the "tech" feel with a user-friendly touch.
- **Interactive Elements:** Buttons and tags utilize the `rounded-lg (1rem)` or `rounded-xl (1.5rem)` tokens to make them feel more "clickable" and distinct from structural containers.
- **Consistency:** Icons should follow the same corner radius logic, avoiding sharp points to maintain the approachable brand voice.

## Components
- **Buttons:** Primary buttons are solid Indigo (`#4F46E5`) with white text. Secondary buttons use a `Slate-100` background or a simple border with no fill.
- **Input Fields:** Minimalist design with a 1px border. On focus, the border transitions to Primary Indigo with a soft 2px glow. Placeholders are in `Slate-400`.
- **Cards:** White background, 1px `Slate-200` border, and no shadow. Used to group booking options or travel itineraries.
- **AI Chat Bubbles:** The AI’s responses are on a subtle `Slate-50` background, while user messages are represented by clean text without a bubble, using a distinct icon or avatar to minimize visual noise.
- **Chips/Badges:** Small, `rounded-lg` elements with low-saturation backgrounds (e.g., light blue for "Pending," light green for "Confirmed") to provide status at a glance without distracting from the main flow.
- **Transitions:** All hover and active states must use a `200ms ease-out` transition for color and border changes to reinforce the premium feel.