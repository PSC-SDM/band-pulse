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
