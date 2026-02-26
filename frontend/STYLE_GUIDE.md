# BandPulse · Color Style Guide

This guide defines how color is used in BandPulse.  
Color is not decorative: **it communicates context, structure, and time**.  
Any usage outside this intent is considered incorrect.

---

## Official Palette

### Black
Hex: `#000000`

**Intent**  
Night context, stage, backstage, visual silence.

<!-- **Allowed usage**  
Secondary backgrounds  
Cards  
Headers  
Sidebars  
Tables  
Persistent containers   -->

**Restrictions**  
Do not use for long-form text  
Do not use as an emphasis color  

---

### Prussian Blue
Hex: `#14213D`

**Intent**  
Structure, reliability, system, stability.

<!-- **Allowed usage**  
Secondary backgrounds  
Cards  
Headers  
Sidebars  
Tables  
Persistent containers   -->


**Allowed usage**  
Primary backgrounds in dark mode  
Loading screens  
Overlays  
Hero sections  

**Restrictions**  
Do not use for alerts  
Do not compete with orange  

---

### White
Hex: `#FFFFFF`

**Intent**  
Content, cognitive focus, readability.

**Allowed usage**  
Secondary backgrounds in light mode  
Dividers  
Borders  
Disabled states  
Skeleton loaders  

**Restrictions**  
Do not use as a CTA  
Do not use as an emphasis color  

---

### Alabaster Grey
Hex: `#E5E5E5`

**Intent**  
Visual rest, separation, neutrality.


**Allowed usage**  
Primary text on dark backgrounds  
Light-mode screens  
Forms  
Long reading experiences  

**Restrictions**  
Do not use for primary text  
Do not use for actions  

---

### Orange
Hex: `#FCA311`

**Intent**  
Temporal activation, controlled urgency, moments in time.

**Allowed usage**  
Primary CTA  
Event notifications  
Availability alerts  
Key dates  
Counters  
Temporal status badges  

**Critical restrictions**  
Do not use as a dominant background  
Do not use for long-form text  
Do not exceed 10% of the visible area of a screen  
If everything is orange, nothing is important  

---

## Visual Hierarchy

Level 1 · Context  
Black / Prussian Blue  

Level 2 · Content  
White / Alabaster Grey  

Level 3 · Action and time  
Orange  

This hierarchy must not be inverted.

---

## UI States

**Default**  
Prussian Blue + White  

**Hover**  
Adjust luminosity or contrast  
Do not change the base color  

**Active / Focus**  
Orange as border, underline, or icon  
Never as a large fill  

**Disabled**  
Alabaster Grey with reduced opacity  

**Error**  
Do not introduce red  
Use orange with iconography and explicit copy  

**Success**  
White on Prussian Blue or Black  
Orange only if temporal urgency exists  

---

## Gradients

Gradients are allowed only for:
Landing pages  
Hero sections  
Visual transitions  

Do not use gradients in:
Buttons  
Cards  
Key interactive elements  

The operational UI must remain flat and readable.

---

## Explicit Prohibitions

Introducing colors outside the palette  
Using orange as a dominant color  
Using color without clear semantic meaning  
Using gradients as a default solution  
Using black for long-form text  
Using white as a CTA  

---

## Final Principle

BandPulse should feel:
quiet  
precise  
reliable  

And only at specific moments:
urgent  

Color exists to signal **when something matters**.

---

## Border Radius & Rounding

Border radius creates **visual hierarchy** and **modern refinement** without decorative excess.

**Hierarchy of Rounding**  

Large containers: `32px` (borderRadius: '32px')  
Cards / Sections: `28px` (rounded-spacing or borderRadius)  
Input fields: `20px`  
Medium elements: `14-16px` (avatars, badges)  
Small buttons: `10-12px` (pills, tags, compact CTAs)  
Micro elements: `8px` (genre tags, status indicators)

**Principles**  
- Larger elements = larger radius
- Parent containers should have larger radius than children
- Example: Card (28px) > Avatar (14px) > Badge (10px)
- Maintain consistent proportions: don't mix sharp and heavily rounded elements

**Usage**  
```jsx
// Large section
style={{ borderRadius: '32px' }}

// Card component
className="rounded-[28px]" // or style={{ borderRadius: '28px' }}

// Input field
className="rounded-[20px]"

// Avatar
className="rounded-xl" // 12px, or rounded-[14px] for custom
```

**Restrictions**  
- Do not use `rounded-full` for non-circular elements
- Do not use sharp corners (`rounded-none`) in primary UI
- Do not mix different radius scales without intentionality

---

## Layout Patterns

### Card Layouts

**Vertical Artist Cards** (current standard)  
- Prominent square avatar (aspect-square) at top
- Content section below with hierarchy: name > location > metadata
- Follow button positioned over avatar (top-left)
- Hover: lift effect (-translate-y-1) + shadow + border brightening

**Grid Systems**  
- Mobile: 1 column
- Tablet (md): 2 columns  
- Desktop (lg): 3 columns
- Gap: `gap-6` (24px) for breathing room

**Content Spacing**  
- Section padding: `p-8` (32px) for major sections
- Card padding: `p-5` (20px) for content areas
- Compact spacing: `p-3` (12px) for dense information

### Visual Rhythm

**Staggered Animations**  
- Base delay: 50-80ms between items
- Formula: `${50 + (index * 80)}ms`
- Duration: 300-700ms for entrance animations

**Z-Index Layers**  
1. Base content: `z-0` (default)
2. Following section: `z-10`
3. Search section: `z-[100]`
4. Dropdown menus: `z-[200]`
5. Modals/Overlays: `z-[300]`
6. Toasts/Notifications: `z-[400]`

---

## Depth & Layering

Depth is created through **subtle gradients**, **shadows**, and **transparency** — not decoration.

### Gradients (Subtle)

**Allowed for depth**  
```css
/* Card depth overlay */
bg-gradient-to-br from-white/[0.02] to-transparent

/* Image bottom fade for text legibility */
bg-gradient-to-t from-prussian/90 via-prussian/20 to-transparent

/* Accent line */
bg-gradient-to-r from-transparent via-white/10 to-transparent
```

**Principles**  
- Opacity: 0.01 to 0.04 for structure
- Always pointer-events-none for overlays
- Use for spatial separation, never as primary color

### Shadows

**Hover states**  
```css
hover:shadow-2xl hover:shadow-black/40
```

**Dropdown menus**  
```css
shadow-2xl shadow-black/60
```

**Principles**  
- Shadows indicate interactivity or prominence
- Use sparingly; not all elements need shadows
- Darker shadows (black/60) for floating elements

### Transparency & Borders

**Background transparency**  
- Cards: `bg-prussian` (solid) or `bg-night/40` (subtle)
- Borders: `border-white/[0.04]` to `border-white/20`
- Hover: Increase border opacity (`border-white/10` → `border-white/20`)

**Backdrop Effects**  
```css
backdrop-blur-sm  /* For dropdowns, modals */
```

---

## Motion & Transitions

Motion is **purposeful** and **refined** — never distracting.

### Transition Duration

**Instant feedback**: 150-200ms  
- Color changes
- Border changes
- Opacity toggles

**Smooth transitions**: 300ms  
- Transform (scale, translate)
- Complex state changes

**Dramatic effects**: 500-700ms  
- Page entrance animations
- Major layout shifts

### Transform Effects

**Hover lifts**  
```css
hover:-translate-y-1 transition-all duration-300
```

**Scale interactions**  
```css
hover:scale-105 transition-transform duration-200
```

**Image zoom**  
```css
group-hover:scale-105 transition-transform duration-700 ease-out
```

### Animation Principles

- Use `transition-all` for multi-property changes
- Use specific transitions (`transition-transform`) when possible for performance
- Easing: `ease-out` for entrances, `ease-in-out` for continuous motion
- Stagger delays: 50-100ms for sequential reveals

**Entrance Animations**  
```css
opacity-0 animate-fade-up
style={{ animationFillMode: 'forwards', animationDelay: '...' }}
```

---

## Composition & Spacing

### Asymmetric Headers

Large title + small counter creates visual interest:
```jsx
<h1 className="text-5xl md:text-6xl">Artists</h1>
<span className="text-2xl text-orange">{count}</span>
```

### Micro Typography

**Section labels**: `text-[10px] uppercase tracking-[0.2em] text-alabaster/30`  
- Extreme letterspacing for editorial feel
- Always low opacity for secondary information

**Body hierarchy**  
- Primary: `text-white font-semibold`
- Secondary: `text-alabaster/60`
- Tertiary: `text-alabaster/40`
- Disabled: `text-alabaster/20`

### Visual Breathing

**Margins between sections**: `mb-16` (64px)  
**Internal section spacing**: `mb-8` to `mb-12` (32-48px)  
**Element gaps**: `gap-2` to `gap-6` (8-24px)
**Line spacing**: `leading-relaxed` for body copy

---

## Implementation Examples

### Standard Card
```jsx
<div className="bg-prussian border border-white/[0.04] 
               hover:border-white/20 hover:-translate-y-1 hover:shadow-2xl
               transition-all duration-300 relative overflow-hidden"
     style={{ borderRadius: '28px' }}>
    {/* Depth overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent 
                   pointer-events-none" style={{ borderRadius: '28px' }} />
    
    {/* Content */}
</div>
```

### Search Input
```jsx
<input className="bg-night/40 border border-white/10 
                 focus:border-orange/40 focus:bg-night/60
                 transition-all duration-300"
       style={{ borderRadius: '20px' }} />
```

### Dropdown Menu
```jsx
<div className="absolute bg-prussian border border-white/10
               shadow-2xl shadow-black/60 z-[200]
               backdrop-blur-sm"
     style={{ borderRadius: '24px' }}>
</div>
```

---

## Design Review Checklist

Before shipping, verify:

- [ ] Orange usage < 10% of screen area
- [ ] Border radius hierarchy is consistent
- [ ] Z-index layers don't conflict
- [ ] Hover states have appropriate lift/shadow
- [ ] Transitions are smooth (200-700ms range)
- [ ] Typography hierarchy is clear (white → alabaster/60 → alabaster/40)
- [ ] Spacing follows rhythm (8px, 12px, 20px, 24px, 32px, 48px, 64px)
- [ ] Cards have depth overlays when appropriate
- [ ] Animations use `animationFillMode: 'forwards'`
- [ ] Dropdowns have z-[200] minimum

---

## Anti-Patterns to Avoid

❌ Using rounded-full on rectangles  
❌ Mixing sharp corners with heavily rounded elements  
❌ Nested overflow-hidden that clips dropdowns  
❌ Gradients as primary backgrounds (use solid colors)  
❌ More than 2-3 shadow intensities  
❌ Transition-all on performance-critical elements without reason  
❌ Orange on large surface areas  
❌ Z-index values without system (use defined layers)  
❌ Animations longer than 700ms for UI interactions  
❌ Border radius smaller than 8px in modern UI

---

