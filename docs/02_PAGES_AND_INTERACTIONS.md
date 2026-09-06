# Model Portfolio Website — Pages & Interaction Specification

## 1. Route Map

```text
/                       INDEX
/archive                ARCHIVE
/profile                PROFILE
/shoots/[slug]          SHOOTING DETAIL

/studio/login           ADMIN LOGIN
/studio                 STUDIO DASHBOARD
/studio/shootings/new   CREATE SHOOTING
/studio/shootings/[id]  EDIT SHOOTING
```

The public navbar only contains INDEX, ARCHIVE, PROFILE and `[2026]`.

---

# 2. INDEX

## Goal

Show a small set of selected shootings in the strongest possible visual format.

## Data source

Only published shootings where:

```text
featuredOnIndex = true
```

Each shooting contributes one selected cover photo.

## UI anatomy

```text
NAVBAR

                [ portrait ]    [ landscape ]    [ portrait ]
             <—————— infinite horizontal track ——————>

                           drag to explore
```

## Interaction model

### Trackpad / mouse wheel

- horizontal wheel moves gallery
- Shift + wheel can be supported
- normal vertical wheel should not create confusing page scroll because the homepage has no vertical content

### Drag

- pointer down starts drag
- horizontal position directly controls track
- release velocity creates momentum

### Infinite behavior

Continue the existing repeated-set strategy from the personal portfolio.

The current implementation uses repeated sets and periodically normalizes the track position so the gallery appears endless without allowing coordinates to grow indefinitely.

### Center behavior

When a clicked image is not centered:
- animate it to center
- do not navigate yet

When the centered image is clicked:
- open the corresponding shooting

This interaction already exists in the current portfolio and is worth retaining.

### Keyboard fallback

- Left / Right arrows move focus to the previous / next shooting
- Enter opens the focused shooting
- visible focus treatment stays very minimal but must exist

---

# 3. ARCHIVE

## Goal

Display the complete visual body of work.

## Query

Published photos where:

```text
shooting.status = published
photo.archiveVisible = true
```

## Sorting

Default:

```text
shooting.date DESC
photo.sortOrder ASC
```

## Desktop layout

Maximum three columns.

Recommended first implementation:

```css
display: grid;
grid-template-columns: repeat(3, minmax(0, 1fr));
gap: clamp(16px, 2vw, 36px);
align-items: start;
```

Each item preserves its source aspect ratio.

### Why not CSS masonry initially

Masonry can look attractive but introduces content-order and responsive complications.

Start with predictable grid behavior.

If the final photography benefits from a masonry layout, add it later after testing with real image sets.

## Item interaction

Hover:
- subtle metadata fade-in
- no dark overlay

Click:
- go to the parent shooting page

Optional future behavior:
- add `?photo={photoId}`
- shooting page scrolls to that photograph

---

# 4. PROFILE

## Goal

Provide the information needed by someone who wants to understand or contact the model.

## Suggested content hierarchy

```text
MODEL NAME

Short 2–4 sentence profile.

BASE
Cologne / Germany

HEIGHT
...

HAIR
...

EYES
...

SHOE
...

REPRESENTATION
...

CONTACT
email

INSTAGRAM
handle
```

All fields are optional and omitted when empty.

## Visual layout

Desktop:

```text
50% portrait
50% information
```

The content column should not vertically fill the screen with unnecessary text.

Use whitespace.

## Optional future additions

- downloadable comp card
- agency link
- languages
- availability / base cities
- selected clients
- publication list

None are required for MVP.

---

# 5. SHOOTING DETAIL

## URL

```text
/shoots/{slug}
```

## Example page anatomy

```text
NAVBAR

COASTAL LIGHT
COPENHAGEN · MAY 2026

Photography — ...
Styling — ...

                   [ image ]

     [ image ]

                               [ image ]

            [ image ] [ image ]

                   [ image ]

← PREVIOUS              ARCHIVE               NEXT →
FOOTER
```

## Hero metadata

Required:
- title

Optional:
- year/date
- location
- short description
- credits

Do not render empty labels.

## Images

All published images belonging to the shooting are rendered in configured sort order.

### MVP layout algorithm

Suggested automatic rules:

1. first image: wide
2. portrait + portrait pair when two consecutive portrait images exist
3. landscape: wide
4. single portrait: medium width, alternating left/right alignment
5. repeat

This gives the page editorial variation without requiring a visual page builder.

### Later layout control

Add photo field:

```text
layoutHint:
- auto
- full
- wide
- medium
- left
- right
- pair-next
```

The admin can override the automatic layout for special shoots.

---

# 6. `[2026]` OVERLAY

## Trigger

Navbar button:

```text
[2026]
```

## State

Local UI state only.

No route change is required.

## Open behavior

- lock background scroll on scrolling pages
- keep current page visible
- fade surrounding content
- show centered statement
- focus moves into dialog region

## Close behavior

- click backdrop
- Escape
- mobile close control
- restore prior focus

## Initial content

Lorem ipsum is acceptable during prototyping.

Eventually this should be a short statement that says something different from PROFILE.

---

# 7. INITIAL SESSION INTRO

## Trigger logic

Use the same general session logic already present in the personal portfolio:

```text
sessionStorage key absent:
    play intro
    set key
else:
    render site immediately
```

Suggested key:

```text
model-portfolio:intro-played
```

## Intro requirements

- only on first entry in the current browser session
- skip on internal navigation
- skip after returning from a shooting
- no dependency on fake loading percentage
- gallery should preload behind the transition
- reduced-motion fallback

---

# 8. PAGE TRANSITIONS

The public site should use very lightweight transitions.

Recommended:

### INDEX → SHOOTING

- centered INDEX image slightly enlarges
- page fades
- shooting begins with related cover image

A future shared-element transition could make this seamless.

MVP:
- short opacity transition

### ARCHIVE → SHOOTING

- simple fade

### PROFILE / ARCHIVE / INDEX

- content opacity transition ~300–450 ms
- navbar persists

The initial intro remains the strongest motion moment.

---

# 9. MOBILE INDEX

Horizontal gallery remains the main experience.

Differences:

- touch drag is primary
- no hover behavior
- centered card shows a tiny text hint such as `TAP TO OPEN`
- cards are wider relative to viewport
- use `100svh`
- account for browser safe areas

Suggested portrait width:

```text
68–76vw
```

Suggested landscape width:

```text
78–88vw
```

---

# 10. LOADING STATES

Photography is heavy, but loading UI should not dominate.

INDEX:
- preload initial nearby covers
- use neutral background blocks only while an image is unavailable
- avoid spinner overlays

ARCHIVE:
- lazy load below the fold
- preserve aspect-ratio boxes to prevent layout shift

Shooting:
- first image high priority
- later images lazy loaded

---

# 11. Empty States

ARCHIVE with no photos:

```text
ARCHIVE
New work will appear here.
```

Studio with no shootings:
- clear Create Shooting button

Unpublished shooting URL:
- public 404
- admin preview can still render while authenticated

---

# 12. Footer Behavior

No footer on INDEX.

Footer on:
- ARCHIVE
- PROFILE
- SHOOTING

Suggested content:

```text
© 2026 MODEL NAME
INSTAGRAM
CONTACT
·
```

The discreet `·` can navigate to `/studio/login`.

Do not rely on the hidden entry point for security.
