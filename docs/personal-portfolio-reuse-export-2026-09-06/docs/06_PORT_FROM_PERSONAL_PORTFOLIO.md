# Model Portfolio Website — Reuse Plan from `personal-portfolio`

## 1. Goal

Do not rebuild the strongest interaction work from scratch.

The current personal portfolio already contains reusable systems for:

- infinite horizontal gallery navigation
- gallery parallax
- pointer drag
- momentum
- center selection
- session-only intro logic
- year overlay
- page transitions
- image responsiveness

The new site should reuse these ideas while stripping away portfolio-specific copy and visual language.

---

# 2. Gallery Source

Current area:

```text
src/components/sections/GallerySection/
├── GallerySection.tsx
└── GallerySection.css
```

The current gallery has several valuable implementation details:

- seven repeated slide sets
- position normalization around the middle set
- persisted gallery track position
- `requestAnimationFrame` animation loop
- inertial interpolation
- wheel delta normalization
- drag velocity smoothing
- release momentum
- center-hit detection
- click once to center
- click centered card to navigate
- large internal image transform for parallax

This is the technical heart of the new INDEX page.

---

# 3. What to Change in Gallery

## Static project source

Current concept:

```ts
PROJECTS.map(...)
```

New:

```ts
slides.map(...)
```

Receive shooting data from props.

---

## Naming

Replace:

```text
GallerySection
gallery-card
projectSlug
OPEN PROJECT
```

with:

```text
IndexGallery
index-gallery__item
shootingSlug
VIEW SERIES
```

The code can keep internal names initially if faster, but the new repository should eventually reflect the new domain.

---

## Navigation

Current:

```ts
navigate(`/work/${projectSlug}`)
```

New Next.js version:

```ts
router.push(`/shoots/${shootingSlug}`)
```

---

## Data

Current card:

```ts
{
  id,
  orientation,
  image,
  slug
}
```

New card can remain almost identical:

```ts
{
  id,
  orientation,
  image,
  slug
}
```

The difference is semantic:
- `id` = shooting id
- `image` = selected shooting cover
- `slug` = shooting slug

This makes the port especially straightforward.

---

# 4. Gallery Behavior to Retain

## Infinite normalization

Retain exactly.

It is more reliable than simply cloning one row and jumping at the edge.

## Inertia

Retain.

It makes the gallery feel custom instead of like a standard scroll container.

## Click-to-center

Retain.

This is a strong interaction for a model portfolio because it gives each image a deliberate center-stage moment before opening the full series.

## Position persistence

Retain.

When returning from a shooting, the visitor should return to the same place in INDEX rather than restart from the first image.

## Parallax

Retain, but visually retune.

The current implementation uses a strong scale/shift combination.

For fashion photography, test a lower maximum shift and slightly lower internal scale so faces and framing are not distorted too aggressively.

---

# 5. Gallery Behavior to Simplify

Current gallery includes:

```text
[THE GALLERY]
OPEN PROJECT marker
DRAG/CLICK/SCROLL TO NAVIGATE
```

New site recommendation:

Remove:
- `[THE GALLERY]`

Replace:
- `OPEN PROJECT` → `VIEW SERIES` or `OPEN`

Simplify:
- `DRAG/CLICK/SCROLL TO NAVIGATE`
→ `DRAG TO EXPLORE`

Hide the hint permanently after first interaction in the current session if desired.

---

# 6. Current Intro Logic to Reuse

Current app uses a session storage key:

```text
portfolio:intro-played
```

The logic:
- checks on first render
- marks the intro as played
- skips loader on subsequent internal/refresh behavior within the browser session as designed

For the new project:

```text
model-portfolio:intro-played
```

Keep the session-based concept.

Replace the current multi-second progress/bike loader with the 1.2–1.4 s photographic slit reveal.

---

# 7. Current `[2026]` Logic to Reuse

The existing navbar already contains:

```text
[2026]
```

and opens a centered overlay.

Existing useful behavior:
- local open state
- Escape closes
- background scroll lock
- backdrop click closes
- click inside panel does not close

Keep the mechanics.

Change:
- visual panel should no longer feel like a modal card
- use pure page-centered typography
- update accessible label
- use model-specific text

---

# 8. Navbar

Do not copy the entire developer portfolio navbar visually.

The existing navbar has more features than needed:
- theme toggle
- multiple portfolio sections
- hidden-on-scroll behavior
- custom eye interaction
- mobile indicators

For the model site, rebuild the Navbar component around a simpler structure.

Keep only any utility code that remains valuable.

New desktop navbar:

```text
MODEL NAME        INDEX  ARCHIVE  PROFILE        [2026]
```

No theme switcher.

The public site should have one fixed visual mode.

---

# 9. Page Transition

Current project has:

```text
src/components/overlay/PageTransition/
```

Do not automatically port the full transition system.

First create a minimal route fade.

Only reuse current transition utilities if the simpler version feels too plain.

The model site's INDEX gallery and initial intro already provide enough motion identity.

---

# 10. Smooth Scroll

Current project uses a SmoothScroll system and Lenis.

Recommendation:
- do not use smooth scrolling on INDEX because it is a fixed horizontal interaction
- test native vertical scroll first on ARCHIVE/PROFILE/shooting pages

Only add Lenis if it meaningfully improves the editorial scrolling feel and does not interfere with accessibility or gallery gestures.

---

# 11. Cursor Trail

Do not port the CursorTrail by default.

The model site should be quieter.

If a custom cursor is used:
- simple dot or text `VIEW`
- only on INDEX
- no decorative trail

---

# 12. Responsive Image Component

The existing responsive image abstraction may be reusable conceptually.

However, in Next.js the new implementation should first evaluate `next/image`.

The new image source comes from Blob/database instead of build-time project assets.

Store:
- URL
- width
- height
- alt

so layout can be calculated without waiting for the image to load.

---

# 13. Suggested Migration Workflow

Do not copy the full repository and delete things.

Create a clean new repository.

Then selectively port:

```text
1. gallery physics/utilities
2. gallery component
3. wheel normalization
4. intro session logic
5. overlay behavior
6. any tested easing helpers
```

This avoids bringing developer-portfolio assumptions into the new design.

---

# 14. What the New Repository Should Feel Like

The personal portfolio is:

```text
designer/developer
structured
interactive
project-driven
```

The model portfolio should be:

```text
photographic
editorial
silent
image-driven
```

The shared code is an implementation advantage, not a reason for the two sites to look related.
