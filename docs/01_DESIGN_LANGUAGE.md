# Model Portfolio Website — Design Language

## 1. Design Direction

The visual language is based on editorial fashion portfolios, printed contact sheets, gallery indexes and stripped-back art direction.

The interface should feel designed, but not decorated.

The strongest design element is photography itself.

### Keywords

- monochrome
- editorial
- restrained
- photographic
- quiet
- sharp
- high-contrast
- airy
- intentional
- contemporary

### Avoid

- SaaS aesthetics
- soft cards
- rounded UI containers
- gradients
- colored accents
- glassmorphism
- large CTA buttons
- icon-heavy navigation
- oversized marketing headlines
- unnecessary section labels
- constant animation
- conventional carousel arrows

---

## 2. Color System

The UI should remain monochrome.

### Core tokens

```css
--black: #000000;
--near-black: #0A0A0A;
--graphite: #1A1A1A;
--mid-gray: #777777;
--light-gray: #D9D9D9;
--off-white: #F6F6F3;
--white: #FFFFFF;
```

### Recommended default

Public page background:

```css
--page-bg: #FFFFFF;
--page-fg: #000000;
```

For a darker editorial variant:

```css
--page-bg: #050505;
--page-fg: #FFFFFF;
```

Do not alternate page colors randomly.

A single dominant mode is stronger.

### Photography treatment

"Black and white website" should primarily refer to the interface.

Recommended:
- keep photographs in their intended original treatment
- do not automatically grayscale every photo

Optional direction if a fully monochrome portfolio is specifically desired later:

```css
img {
  filter: grayscale(1);
}
```

A more interesting optional treatment is:
- INDEX covers grayscale by default
- original color appears only while the centered image is active

This should only be used if it supports the actual photography.

---

## 3. Typography

The typography should be understated enough not to compete with faces and clothing.

### Primary typeface

Use a neutral grotesk / modern sans.

Recommended free choices:

1. **Instrument Sans**
2. **Inter**
3. **Manrope**

Preferred direction:

> Instrument Sans

Usage:
- navigation
- metadata
- captions
- body text
- buttons
- Studio can use the same family

### Editorial secondary typeface

Use only if a serif adds value.

Recommended:

> Instrument Serif

Usage:
- one large phrase on PROFILE
- shooting title
- occasional year overlay statement

Do not use the serif in every heading.

The site can also work perfectly with one type family only.

---

## 4. Type Scale

Example desktop tokens:

```css
--text-xs: 10px;
--text-sm: 12px;
--text-md: 14px;
--text-body: clamp(15px, 1.1vw, 18px);
--text-title: clamp(38px, 6vw, 96px);
```

### Navigation

```css
font-size: 11px;
font-weight: 500;
letter-spacing: 0.08em;
text-transform: uppercase;
```

### Metadata

```css
font-size: 10px;
letter-spacing: 0.06em;
text-transform: uppercase;
```

### Body

```css
font-size: 16px;
line-height: 1.45;
```

### Shooting title

Two possible directions:

Minimal:
```css
font: 500 18px/1.1 Instrument Sans;
```

Editorial:
```css
font: 400 clamp(46px, 7vw, 112px)/0.92 Instrument Serif;
```

Choose one direction and stay consistent.

---

## 5. Spacing System

Whitespace is a structural element.

### Global page inset

Desktop:
```css
padding-inline: clamp(24px, 2.8vw, 48px);
```

Tablet:
```css
padding-inline: 24px;
```

Mobile:
```css
padding-inline: 16px;
```

### Vertical spacing

Recommended scale:

```text
4
8
12
16
24
32
48
64
96
128
160
```

Avoid tight stacks of content.

PROFILE and shooting pages should intentionally contain empty areas.

---

## 6. Grid

Desktop base:

```text
12-column conceptual grid
```

The implementation does not need a visible or complicated CSS grid everywhere.

Use the grid to align:
- navbar edges
- metadata
- profile text
- image starts
- shooting headings
- footer

### ARCHIVE

Desktop:
- 3 image columns maximum

Tablet:
- 2 columns

Mobile:
- 1 column

### PROFILE

Desktop:
- 6/6 or 7/5 split

---

## 7. Navbar Language

The navbar must feel like text placed on the composition, not a component.

### Rules

- transparent
- fixed
- no container background
- no shadow
- no rounded corners
- no border
- no large logo mark
- no hamburger circle
- no icon button styling

### Position

Desktop example:

```css
top: 24px;
left: 32px;
right: 32px;
height: 24px;
```

### Hover

Simple:

```css
opacity: 0.55 -> 1;
transition: opacity 180ms ease;
```

Optional text-slide hover from the existing portfolio may be reused, but it should be subtler than on the developer portfolio.

### Active indicator

Preferred:

```text
INDEX
─────
```

A 1 px underline or opacity change is enough.

---

## 8. Homepage Gallery Language

The homepage gallery is the visual identity of the site.

### Card design

- no border
- no radius
- no shadow
- no captions directly attached by default
- preserve photographic aspect ratio
- no visible loading skeleton once loaded
- neutral placeholder while loading

### Movement

Keep:
- inertial drag
- center focus
- infinite wrapping
- image parallax

Reduce:
- exaggerated parallax
- obvious action graphics
- persistent interaction instructions

### Center interaction

When a card is centered and hovered:

Option A:
```text
VIEW SERIES
```

appears very small beneath the center.

Option B, preferred:
- cursor changes
- tiny `OPEN` appears near cursor or lower center
- no large marker

### Drag hint

First visit only:

```text
DRAG TO EXPLORE
```

Small, bottom-center, fades after the first interaction.

---

## 9. Motion Language

Motion must be purposeful.

### General duration ranges

Micro interaction:
```text
120–220 ms
```

Page-level reveal:
```text
350–700 ms
```

Initial session intro:
```text
1.2–1.4 s total
```

### Easing

Recommended:

```css
cubic-bezier(0.22, 1, 0.36, 1)
```

This produces a quick initial movement and calm settle.

### Page transitions

Keep transitions simpler than the personal developer portfolio.

Recommended:
- outgoing content opacity 1 -> 0
- slight image scale 1 -> 0.985
- incoming page fades in after route is ready

Avoid:
- full-screen branded transition for every click
- long transition blockers
- excessive sliding panels

The only strong transition should be the initial session reveal.

---

## 10. Initial Intro Visual Language

### Photographic Slit Reveal

Base:
- solid black
- white text
- no progress bar
- no percentage
- no loading label

Name:
- 11–13 px
- uppercase
- tracked
- centered

Reveal slit:
- 1–2 px starting height
- expands from horizontal center
- shows actual gallery underneath

The navbar should appear only at the final 15–20% of the reveal.

---

## 11. `[2026]` Overlay Language

No modal card.

Overlay uses the page itself as the background.

Example:

```css
.site-underlay {
  opacity: 0.12;
}
```

Centered text:
- width: min(680px, calc(100vw - 40px))
- centered vertically and horizontally
- text-align: center or left depending final art direction

Recommended typography:

```text
[2026]
12 px uppercase

Statement
24–38 px serif or 18–24 px sans
```

---

## 12. ARCHIVE Image Behavior

Hover should be informative but quiet.

Desktop hover:
- image opacity stays 1
- metadata appears under the image
- optional image scale 1 -> 1.01

Do not place a black overlay over faces unless necessary.

Image metadata:

```text
SERIES TITLE
2026
```

Photographer credit can live on the shooting page rather than cluttering the archive.

---

## 13. Shooting Page Language

A shooting page should behave like an editorial spread translated to a vertical screen.

### Image widths

Possible width classes:

```text
full      100%
wide      78–88%
medium    55–68%
portrait  38–48%
pair      two images sharing 70–100%
```

A future `layoutHint` field can allow the admin to influence this.

MVP:
- use full / medium / pair automatically based on orientation and sequence

### Captions

Captions are optional.

When present:
- 10–12 px
- max 40–50 characters per line
- placed below image
- never overlay important image areas

---

## 14. PROFILE Language

PROFILE can carry slightly more typography than other pages.

Suggested composition:

```text
┌───────────────────────┬──────────────────────────┐
│                       │                          │
│      PORTRAIT         │      MODEL NAME          │
│                       │                          │
│                       │      short bio           │
│                       │                          │
│                       │      HEIGHT   ...        │
│                       │      HAIR     ...        │
│                       │      EYES     ...        │
│                       │                          │
│                       │      CONTACT             │
└───────────────────────┴──────────────────────────┘
```

Never put measurements into styled cards.

Use simple aligned text rows.

---

## 15. Footer

The footer only exists on vertically scrolling pages:

- ARCHIVE
- PROFILE
- shooting detail pages

The homepage remains one viewport and therefore has no traditional footer.

Suggested footer:

```text
© 2026 MODEL NAME                   INSTAGRAM   CONTACT   ·
```

The final dot may be the discreet Studio entry.

Font:
- 10–11 px

No border is required.

---

## 16. Responsive Behavior

### Desktop

The most expressive version.

- full infinite gallery interaction
- hover states
- 3-column archive
- large editorial spacing

### Tablet

- preserve horizontal INDEX gallery
- 2-column archive
- reduced image gaps
- profile may remain two-column if space allows

### Mobile

INDEX:
- horizontal touch drag
- no hover-dependent behavior
- active centered card can show tiny `TAP TO OPEN`
- cards approximately 68–78vw wide

ARCHIVE:
- one column
- large images
- natural aspect ratios

PROFILE:
- portrait first
- content second

Navbar:
- model name + MENU
- compact full-screen menu

---

## 17. Accessibility

Minimal does not mean invisible to assistive technology.

Requirements:

- all interactive elements keyboard reachable
- visible keyboard focus state
- meaningful image `alt` text
- empty alt for purely duplicate/decorative imagery when appropriate
- Escape closes overlays
- reduced-motion path
- sufficient text contrast
- mobile menu has proper focus handling
- gallery drag must not be the only navigation mechanism
- centered gallery card should also be reachable and openable by keyboard

---

## 18. Design Rule

When deciding whether to add an element, ask:

> Does this help the visitor see the photography, understand the model, or move through the portfolio?

If the answer is no, remove it.
