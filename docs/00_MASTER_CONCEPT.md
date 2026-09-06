# Model Portfolio Website — Master Concept

## 1. Vision

The website should feel less like a conventional personal portfolio and more like a digital model book, editorial image archive, and quiet fashion publication.

The photography is the product. Interface elements should therefore stay almost invisible and only become noticeable when the visitor needs them.

The core impression should be:

- minimal
- editorial
- photographic
- monochrome
- confident
- calm
- precise
- contemporary
- premium without feeling luxurious for the sake of it

The website should avoid typical portfolio patterns such as oversized hero copy, long introductory sections, cards, badges, feature blocks, gradients, decorative backgrounds, and visible UI chrome.

A visitor should open the site and immediately enter the image world.

---

## 2. Core Experience

The public website has three main navigation destinations:

1. **INDEX** — the homepage and curated portfolio
2. **ARCHIVE** — the complete published image archive
3. **PROFILE** — model information, short biography, contact and optional model details

In addition, every shooting receives its own dynamic detail page:

- `/shoots/{slug}`

These shooting pages are part of the content structure, but they are not a fourth navigation item.

A separate protected area is used to maintain content:

- `/studio`
- `/studio/login`

The Studio is intentionally visually separated from the public portfolio and can prioritize usability over the public site's extreme minimalism.

---

## 3. Naming

### Recommended navigation

`INDEX`  
`ARCHIVE`  
`PROFILE`  
`[2026]`

### Why these names

**INDEX** works well for the homepage because the page acts as a curated visual index of selected shootings.

**ARCHIVE** is more accurate than "Lookbook" if the page eventually contains almost every published photograph. A lookbook normally implies a deliberately selected collection or a specific fashion collection.

**PROFILE** is better than "About Me" for a model portfolio. It can naturally contain biography, location, measurements, agency information, booking/contact information and social links without sounding like a generic portfolio page.

### Alternative naming directions

More fashion/editorial:
- SELECTED
- ARCHIVE
- PROFILE

More personal:
- WORK
- JOURNAL
- PROFILE

More minimal:
- INDEX
- ALL
- INFO

The recommended system remains:

> INDEX / ARCHIVE / PROFILE / [2026]

---

## 4. Public Site Structure

```text
/
├── INDEX
│   └── infinite horizontal curated shooting gallery
│
├── /archive
│   └── complete chronological / curated image grid
│
├── /profile
│   └── portrait + model profile + contact
│
└── /shoots/[slug]
    └── individual shooting/editorial page

/studio/login
└── hidden/discreet entry point

/studio
├── shootings
├── create shooting
├── edit shooting
├── upload/reorder photos
└── publish/unpublish
```

---

## 5. Homepage — INDEX

### Purpose

The homepage should not explain the website.

It should simply be the portfolio.

The complete homepage occupies one viewport:

```css
height: 100svh;
overflow: hidden;
```

There is no normal vertical homepage scroll.

### Layout

The almost invisible fixed navbar sits above the main experience.

The remaining viewport contains one horizontal infinite gallery.

The gallery is based directly on the interaction system already implemented in the personal portfolio:

- infinite repeated image sets
- drag navigation
- trackpad / horizontal-wheel navigation
- inertial movement
- card centering
- image parallax within cards
- centered-card interaction
- click to open detail page
- persistence of gallery position when returning from a detail page

The model site should remove anything that makes the component feel like a development/project portfolio.

Recommended removals or changes:

- remove `[THE GALLERY]`
- replace `OPEN PROJECT` with `VIEW SERIES` or simply `OPEN`
- make the navigation hint considerably quieter
- remove excessive visual markers if they compete with photography
- keep the center-based interaction model
- keep the parallax effect, but slightly reduce its intensity if necessary
- use shooting covers rather than project thumbnails

### Homepage card meaning

Every visible gallery card represents a **shooting**, not an individual photograph.

Each shooting has one selected cover image for the INDEX.

Clicking a centered card opens:

```text
/shoots/{shooting-slug}
```

That page then contains all published photographs belonging to that shooting.

### Suggested image sizing

Desktop:
- portrait cards: approximately 46–58vh high
- landscape cards: approximately 38–50vh high
- card gap: approximately 2–4vw

The gallery should never feel like a carousel component inside a webpage. It should feel like the webpage itself.

---

## 6. First-Session Intro Animation

The intro should only play once during a browser session.

The existing portfolio already uses the correct basic behavior:

```text
sessionStorage
→ intro has played
→ skip animation until the browser session ends
```

The new intro should be considerably shorter than the current portfolio loader.

### Recommended concept: Photographic Slit Reveal

The page initially appears as a black screen.

Sequence:

**0.00–0.20 s**
- black viewport
- no navbar
- no visible gallery

**0.20–0.45 s**
- the model name appears in the exact center
- small uppercase grotesk typography
- high letter spacing
- optional tiny `[2026]` below

**0.45–0.75 s**
- a thin horizontal white slit appears through the center
- it contains a small moving fragment of the already-loaded first gallery image

**0.75–1.15 s**
- the slit rapidly expands vertically until it reveals the complete homepage
- the model name fades out during the expansion
- the gallery is already positioned underneath

**1.15–1.30 s**
- navbar fades in
- interaction becomes available

Total target duration:

> approximately 1.2–1.4 seconds

The animation should feel like a photographic shutter, contact-sheet reveal, or film aperture rather than a loading screen.

### Important behavior

- run once per session
- never delay the site just to finish the animation
- preload at least the initially visible gallery images
- use `prefers-reduced-motion`
- reduced-motion version should simply fade the page in within ~200–300 ms
- do not use repeated bright flashes

---

## 7. `[2026]` Overlay

The navbar includes `[2026]` as a small, quiet interactive element.

Clicking it does not navigate away.

Instead, an overlay appears in the center of the current page.

### Visual behavior

- preserve the current page underneath
- slightly lower the page contrast or opacity
- no visible modal card
- no border
- no shadow
- no conventional close button required on desktop
- clicking outside closes it
- Escape closes it
- on mobile, a small `×` can be added for discoverability

Initial copy can remain placeholder text.

Suggested structure:

```text
[2026]

LOREM IPSUM DOLOR SIT AMET...

short paragraph / manifesto / introduction
```

Later this can become a short personal statement rather than duplicating the PROFILE page.

The overlay should feel like a temporary editorial caption placed over the website.

---

## 8. ARCHIVE

### Purpose

ARCHIVE contains all published portfolio photographs.

Unlike INDEX, it is not limited to one selected cover per shooting.

### Layout

Desktop:
- maximum 3 columns
- large image sizes
- generous whitespace
- preserve original aspect ratios
- no uniform thumbnail crops

Tablet:
- 2 columns

Mobile:
- 1 column

Prefer CSS Grid over masonry libraries for the first version.

A controlled irregular grid is more editorial and easier to keep predictable.

Possible desktop rhythm:

```text
| image | image | image |
| large image  | image |
| image | image |       |
```

However, the first implementation can simply use three equal columns with natural image aspect ratios.

### Ordering

Recommended default:

1. newest shooting first
2. within each shooting: configured image order

Later optional filters:
- year
- editorial / test / commercial
- location
- photographer

Do not add filters until the archive is large enough to need them.

### Interaction

Hover:
- image remains visually dominant
- small metadata appears beneath or in a corner:
  - shooting title
  - year
  - optional photographer

Click:
- opens the corresponding shooting page
- optionally passes the clicked image index so the shooting page can start near that image later

---

## 9. Shooting Detail Page

Example:

```text
/shoots/coastal-light
```

### Purpose

Each shooting page is a self-contained editorial.

### Header

Minimal metadata:

```text
COASTAL LIGHT
COPENHAGEN · 2026

Photography — Name
Styling — Name
Makeup — Name
```

Only fields with actual content are rendered.

### Image flow

The page should feel more like a magazine editorial than an image viewer.

Recommended layout rules:

- first image can be large/full-width
- following images alternate between:
  - centered portrait
  - paired portraits
  - large landscape
  - narrow image aligned left or right
- preserve natural aspect ratios
- no card containers
- no rounded corners
- no visible gallery chrome

For MVP, use a consistent one-column image stream with occasional two-image rows. The admin can later optionally assign layout hints per image.

### Navigation

At the bottom:

```text
← PREVIOUS SERIES

ARCHIVE

NEXT SERIES →
```

The navbar remains present.

---

## 10. PROFILE

PROFILE replaces a generic About page.

### Recommended content

- one strong portrait
- model name
- city / base
- short biography
- height
- optional measurements
- hair
- eyes
- shoe size
- agency / representation if relevant
- email/contact
- Instagram
- optional downloadable comp card later

### Layout

Desktop:
- two-column composition
- image approximately 45–55% width
- information in the remaining column
- large empty space is intentional

Mobile:
- image first
- profile text beneath

### Tone

Do not write a long personal biography.

The page should read like a professional profile, not a CV.

---

## 11. Navbar

The navbar should be visually present but almost disappear into the composition.

### Desktop structure

```text
MODEL NAME                       INDEX   ARCHIVE   PROFILE                       [2026]
```

Alternative, more invisible:

```text
MODEL NAME                  INDEX   ARCHIVE   PROFILE                  [2026]
```

### Styling

- fixed
- transparent
- no blur by default
- no background bar
- no border
- no shadow
- approximately 11–13 px
- uppercase
- moderate tracking
- monochrome
- generous horizontal page inset
- very high z-index
- use mix-blend carefully only if readability remains reliable

### Active state

Avoid pills or visible tabs.

Use one of:
- opacity difference
- 1 px underline
- tiny dot
- subtle text weight change

Recommended:
- inactive: 55–65% opacity
- active: 100% opacity

### Mobile

Use a very small menu trigger rather than squeezing all links into one line.

Possible:

```text
MODEL NAME                                      MENU
```

Opening MENU reveals the three page links and `[2026]` full-screen, still in the same monochrome language.

---

## 12. Hidden Admin Entry

The public site may contain a discreet Studio entry point.

Recommended location:

- bottom of PROFILE or ARCHIVE footer
- a tiny final symbol after copyright

Example:

```text
© 2026 MODEL NAME   INSTAGRAM   CONTACT   ·
```

The final `·` can link to:

```text
/studio/login
```

Important:

> The hidden link is only a visual choice. It is not a security mechanism.

The Studio route must always require real authentication.

The `/studio/login` URL may also simply be bookmarked by the administrator.

---

## 13. Studio / Admin Concept

The Studio should make content management simple enough that adding a new shooting does not require code changes.

### Primary workflow

1. Open Studio
2. Create new shooting
3. Enter metadata
4. Upload images
5. Reorder images by drag and drop
6. Choose cover image
7. Toggle `Featured on INDEX`
8. Preview
9. Publish

Publishing automatically results in:

- the shooting detail page becoming available
- all archive-enabled photos appearing in ARCHIVE
- the selected cover appearing on INDEX if the shooting is featured

### Shooting fields

Required:
- title
- slug
- shoot date or year
- cover image
- at least one photo
- status

Optional:
- location
- short description
- photographer
- styling
- makeup
- hair
- agency/client
- credits
- index visibility
- archive visibility

### Photo fields

- image
- alt text
- caption
- order
- archive visibility
- optional layout hint

---

## 14. Content Philosophy

The site should not become a CMS-driven website that displays every available field.

The database exists to make maintenance easier.

The public interface should remain aggressively selective.

Rules:

- hide empty metadata
- do not show upload dates
- do not show technical image information
- do not show admin concepts publicly
- prefer whitespace over labels
- prefer one excellent image over five UI elements
- use text only where it adds context

---

## 15. Success Criteria

The concept is successful if:

- the homepage feels like a piece of visual work rather than a website template
- the user can understand navigation without explanatory UI
- the first-session intro is memorable but never annoying
- every shooting can be added without touching source code
- images remain the dominant visual element
- the admin can manage content from a browser
- the site remains fast despite being image-heavy
- mobile feels intentionally designed rather than merely responsive
- the public design still works when there are 10, 50 or 500 images in the archive
