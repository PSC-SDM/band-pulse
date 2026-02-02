# BandPulse - Style Guide

## Design Philosophy

BandPulse's visual identity draws inspiration from the raw energy of live music — concert posters, neon venue signs, and the electric atmosphere of underground shows. The design balances bold, attention-grabbing elements with refined typography and careful spacing.

**Core Aesthetic**: Dark, edgy, energetic with neon accents

**Mood**: Underground venue meets modern digital experience

---

## Color Palette

### Deep Space Blue
Base color for backgrounds and dark surfaces. Evokes the darkness of a concert venue.

```css
50:  #ebf2f9
100: #d8e6f3
200: #b1cce7
300: #8ab2db
400: #6399cf
500: #3c7fc3
600: #30669c
700: #244c75
800: #18334e
900: #0c1927  /* Primary dark background */
950: #08121b  /* Deepest background */
```

**Usage**:
- Primary background: `950`
- Cards/surfaces: `900`
- Borders: `800`
- Hover states: `700`

---

### Strong Cyan
Accent color for highlights, CTAs, and neon effects. Represents stage lighting and energy.

```css
50:  #e6fdfe
100: #cefcfd
200: #9cf9fc
300: #6bf6fa
400: #39f2f9  /* Primary accent */
500: #08eff7  /* Main brand cyan */
600: #06bfc6
700: #059094
800: #036063
900: #023031
950: #012223
```

**Usage**:
- Primary CTA buttons: `500-600`
- Headings and important text: `400`
- Glow effects: `500` with opacity
- Borders/accents: `500`

---

### Ash Grey
Neutral color for body text and secondary elements.

```css
50:  #f0f5f3
100: #e0ebe7  /* Primary body text */
200: #c2d6cf
300: #a3c2b7  /* Secondary text */
400: #85ad9e
500: #669986
600: #527a6b  /* Borders */
700: #3d5c51
800: #293d36
900: #141f1b
950: #0e1513
```

**Usage**:
- Body text: `100-200`
- Secondary text: `300`
- Disabled states: `500-600`
- Subtle borders: `600-700`

---

### Parchment
Warm neutral for secondary backgrounds and alternative accents.

```css
50:  #f6f1ee
100: #ede2de
200: #dcc6bc
300: #caa99b
400: #b98c79
500: #a77058
600: #865946
700: #644335
800: #432d23
900: #211612
950: #17100c
```

**Usage**:
- Alternative text color (light mode if needed)
- Secondary cards
- Warm accents
- Footer elements

---

### Soft Apricot
Secondary accent color for warmth and energy contrast.

```css
50:  #fcf2e9
100: #f9e6d2
200: #f3cca5
300: #edb378
400: #e7994b  /* Primary warm accent */
500: #e0801f  /* Main brand orange */
600: #b46618
700: #874d12
800: #5a330c
900: #2d1a06
950: #1f1204
```

**Usage**:
- Secondary CTAs: `500`
- Alternative highlights: `400-500`
- Gradient combinations with cyan
- Warm glow effects

---

## Typography

### Display Font: Anton
Bold, condensed sans-serif perfect for headlines and impact.

```css
font-family: 'Anton', Impact, sans-serif;
```

**Usage**:
- Main headings (h1, h2)
- Logo
- Impact statements
- All-caps preferred
- Tight letter-spacing

**Characteristics**:
- Ultra-bold weight
- Condensed proportions
- High impact
- Concert poster aesthetic

---

### Body Font: Crimson Pro
Elegant serif with strong personality, readable at all sizes.

```css
font-family: 'Crimson Pro', Georgia, serif;
```

**Weights**:
- Regular (400): Body text
- Semibold (600): Emphasis
- Bold (700): Subheadings

**Usage**:
- Body copy
- Descriptions
- UI labels (secondary)
- Links

**Characteristics**:
- High contrast
- Strong serifs
- Excellent readability
- Refined but not stuffy

---

### Button Font: Montserrat
Modern, geometric sans-serif for calls-to-action and interactive elements.

```css
font-family: 'Montserrat', sans-serif;
```

**Weights**:
- Medium (500): Secondary buttons
- Semibold (600): Standard buttons
- Bold (700): Primary CTAs
- ExtraBold (800): Special emphasis

**Usage**:
- All buttons (primary and secondary)
- Navigation items
- Action labels
- Form inputs
- Badge text

**Characteristics**:
- Geometric construction
- Modern and clean
- Excellent legibility at small sizes
- Wide letter-spacing works well
- Professional and trustworthy feel

**Implementation**:
```tsx
// Tailwind class
className="font-button font-bold tracking-wide"
```

---

## Icons

### Iconify React
Using `@iconify/react` for scalable, customizable icons that match the design aesthetic.

**Icon Set**: Material Design Icons (mdi)

**Key Icons**:
- `mdi:guitar-electric` - Logo/brand identity
- `mdi:target` - Follow/tracking functionality
- `mdi:map-marker-radius` - Location/radius features
- `mdi:bell-ring` - Notifications/alerts

**Usage Pattern**:
```tsx
import { Icon } from '@iconify/react';

<Icon icon="mdi:guitar-electric" className="text-3xl text-cyan-400" />
```

**Sizing**:
- Small icons: `text-xl` (1.25rem / 20px)
- Medium icons: `text-2xl` (1.5rem / 24px)
- Large icons: `text-3xl` (1.875rem / 30px)
- Hero icons: `text-4xl` (2.25rem / 36px)

**Color Coordination**:
- Primary features: Cyan variants (`text-cyan-400`, `text-cyan-500`)
- Secondary features: Apricot variants (`text-apricot-400`, `text-apricot-500`)
- Tertiary: Deep Space variants (`text-deep-space-400`)
- Logo/brand: Deep Space 950 on gradient background

**Don'ts**:
❌ Don't use emojis as icons (inconsistent, platform-dependent)
❌ Don't mix icon sets (stick to Material Design Icons)
❌ Don't use too many icon variants in one view

---

## Visual Effects

### Neon Glow

**Cyan Glow**:
```css
box-shadow: 
  0 0 20px rgba(8, 239, 247, 0.4),
  0 0 40px rgba(8, 239, 247, 0.2);
text-shadow: 
  0 0 20px rgba(8, 239, 247, 0.4),
  0 0 40px rgba(8, 239, 247, 0.2);
```

**Apricot Glow**:
```css
box-shadow: 
  0 0 15px rgba(224, 128, 31, 0.5),
  0 0 30px rgba(224, 128, 31, 0.3);
text-shadow: 
  0 0 15px rgba(224, 128, 31, 0.5),
  0 0 30px rgba(224, 128, 31, 0.3);
```

**Usage**:
- Primary headings
- CTA buttons on hover
- Active states
- Feature cards on hover
- Border accents

---

### Noise Texture

Subtle film grain overlay adds texture and depth to prevent flat digital feel.

```css
background-image: url("data:image/svg+xml,...");
opacity: 0.03;
```

**Applied to**: Body element via ::before pseudo-element

---

### Animated Gradients

Pulsing gradient orbs create atmospheric depth and movement.

```css
animation: pulse-glow 2s ease-in-out infinite;
```

**Colors**: Cyan, Apricot, Deep Space Blue
**Blur**: 100-120px
**Opacity**: 20-30%

---

## Animation

### Keyframe Animations

**pulse-glow**: Subtle scale and opacity change
```css
@keyframes pulse-glow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.02); }
}
```

**slide-up**: Entry animation from bottom
```css
@keyframes slide-up {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

**slide-in**: Entry animation from left
```css
@keyframes slide-in {
  0% { opacity: 0; transform: translateX(-30px); }
  100% { opacity: 1; transform: translateX(0); }
}
```

**fade-in**: Simple opacity fade
```css
@keyframes fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

### Timing
- Page load animations: 0.6-0.8s
- Hover transitions: 0.3s
- Stagger delays: 0.1-0.2s between elements

---

## Component Patterns

### Buttons

**Primary CTA**:
- Background: Cyan gradient (`from-cyan-500 to-cyan-600`)
- Text: Deep Space 950
- Font: **Button (Montserrat)** Bold with wide tracking
- Glow effect on hover
- Slide-up overlay on hover

**Secondary Button**:
- Border: 2px Ash 600
- Text: Ash 200
- Font: **Button (Montserrat)** Semibold with wide tracking
- Transparent background
- Border and text lighten on hover

**Button Typography**:
- Use `font-button` class
- Add `tracking-wide` for better readability
- Use bold weight (700) for primary, semibold (600) for secondary
- All-caps for maximum impact (optional)

---

### Cards

**Feature Card**:
- Background: Deep Space 900 (80% opacity)
- Backdrop blur
- Left border (4px) in accent color
- Hover: Translate right (8px)
- Icon in colored box with border

---

### Layout

**Grid System**:
- Max width: 7xl (80rem)
- Two-column hero on desktop
- Full-width on mobile
- 12-unit spacing between sections

**Borders**:
- Generally avoid rounded corners (keep edges sharp)
- Exception: Logo icon only
- Use straight lines and angles for edgy aesthetic

---

## Accessibility

- Minimum contrast ratio: 4.5:1 for body text
- 3:1 for large text (18px+)
- Cyan on deep space: 8:1 ✓
- Ash 200 on deep space 950: 10:1 ✓
- Focus states use visible outlines
- All animations respect `prefers-reduced-motion`

---

## Design Tokens (Tailwind Classes)

### Spacing
- Section padding: `px-6 md:px-12`
- Card padding: `p-6`
- Element gaps: `gap-4` (small), `gap-6` (medium), `gap-12` (large)

### Text Sizes
- Hero: `text-7xl md:text-8xl lg:text-9xl`
- H2/H3: `text-2xl`
- Body large: `text-xl md:text-2xl`
- Body: `text-base`
- Small: `text-sm`

---

## Usage Examples

### Headings
```html
<h1 className="font-display text-8xl text-cyan-400 text-glow-cyan uppercase">
  NEVER MISS A SHOW
</h1>
```

### Body Text
```html
<p className="font-body text-xl text-ash-200 leading-relaxed">
  Track your favorite bands...
</p>
```

### Primary Button
```html
<button className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 
                   text-deep-space-950 font-button font-bold tracking-wide
                   border-glow-cyan hover:from-cyan-400 hover:to-cyan-500 
                   transition-all">
  START TRACKING
</button>
```

### Icon Usage
```tsx
import { Icon } from '@iconify/react';

// In logo
<Icon icon="mdi:guitar-electric" className="text-3xl text-deep-space-950" />

// In feature card
<Icon icon="mdi:target" className="text-3xl text-cyan-400" />
```

### Feature Card
```html
<div className="bg-deep-space-900/80 backdrop-blur-sm border-l-4 border-cyan-500 
                p-6 hover:translate-x-2 transition-all">
  <!-- Content -->
</div>
```

---

## Don'ts

❌ Don't use rounded corners excessively (keep it sharp and edgy)  
❌ Don't mix too many colors in one component  
❌ Don't use soft shadows (use glows or nothing)  
❌ Don't center-align large blocks of body text  
❌ Don't use lowercase in display font headings  
❌ Don't reduce contrast for "aesthetic" reasons  
❌ Don't animate everything (be selective)  

---

*Last updated: February 2026*
