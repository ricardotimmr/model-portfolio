# Model Portfolio

An image-led model portfolio designed to feel less like a conventional portfolio
website and more like a digital model book, editorial archive, and quiet fashion
publication.

Photography is the product. The interface therefore stays deliberately restrained
and only becomes visible when it helps with orientation or interaction.

## Vision

The portfolio should lead directly into the imagery: minimal, editorial,
monochrome, precise, and refined without appearing decorative or performatively
luxurious.

The experience focuses on:

- strong, large-format photography
- calm and confident art direction
- very little visible user interface
- deliberate whitespace instead of additional UI
- precise, purposeful motion
- distinct desktop and mobile experiences

Common marketing and template patterns such as hero copy, feature cards, badges,
gradients, glassmorphism, oversized call-to-action buttons, and constant animation
are intentionally avoided.

## Public experience

The public website consists of three main sections and dynamic shooting pages:

| Route            | Section  | Purpose                                                   |
| ---------------- | -------- | --------------------------------------------------------- |
| `/`              | INDEX    | Curated shootings in switchable horizontal/vertical views |
| `/archive`       | LOOKBOOK | All published photographs approved for the archive        |
| `/profile`       | PROFILE  | Model profile, measurements, contact, and representation  |
| `/shoots/[slug]` | Shooting | A dedicated editorial page for one shooting               |

The fixed navigation is limited to `INDEX`, `LOOKBOOK`, `PROFILE`, and the
automatically determined current year, for example `[2026]`. Shooting pages are
part of the content structure but are not separate navigation items.

### INDEX

The home page is the portfolio and occupies exactly one viewport. It opens as a
horizontal, seemingly infinite gallery of selected shootings. Selecting the
already-active `INDEX` navigation item toggles between that view and a vertical
gallery.

Each card represents a shooting and displays its selected cover image. The gallery
supports:

- trackpad, mouse wheel, and drag gestures
- inertia and momentum
- continuous navigation through normalized, repeated image sets
- subtle parallax within the images
- focus on the centered image
- first click to center, second click to open
- restoration of the gallery position after returning
- keyboard navigation as an equivalent input method

The vertical mode keeps the same infinite navigation, cover cards,
centered-card behavior, hover reveal, route opening, and image parallax, but
enlarges the cards for a more immersive view. The active shooting title remains
fixed to the left of the centered image while its short description remains
fixed to the right. Both texts transition when a different card crosses the
viewport center. Both gallery layouts stay mounted and preloaded. On a mode
change, five measured transition cards move between the two arrangements while
preserving their live image crops; the centered card stays anchored and grows in
place without reloading the gallery.

Both modes remain available on mobile. Touch dragging controls the horizontal
view, while native vertical scrolling controls the vertical view.

### LOOKBOOK

The lookbook presents the complete published image selection. Unlike INDEX, it
shows every photograph approved for the archive rather than one cover per
shooting.

- up to three columns on desktop
- two columns on tablet
- one column on mobile
- natural aspect ratios without standardized crops
- chronological sorting by shooting, followed by each image's defined order
- restrained metadata instead of dark image overlays
- selecting an image opens its associated shooting

Filters for year, category, location, or photographer may be added later, but are
not part of the MVP.

### Shooting pages

Each shooting is presented as a vertical editorial under `/shoots/[slug]`. Its
short bilingual description is top-aligned beside the large two-line title.
Year, location, description, and credits are only displayed when they have been
provided.

The image flow combines large landscape photographs, individually offset portraits,
and portrait pairs. For the MVP, this variation is derived automatically from image
orientation and order. Explicit layout hints can be added later.

`PREVIOUS SERIES`, `LOOKBOOK`, and `NEXT SERIES` connect the editorials at the
end of each page.

### PROFILE

PROFILE is a professional model profile, not a long-form about page. It includes:

- a strong portrait
- model name and base
- a short biography
- height and optional measurements
- hair, eyes, and shoe size
- agency or representation
- email and Instagram
- an optional downloadable comp card in a later phase

Empty fields are not rendered. The portrait and details sit side by side on
desktop, while the text follows the image on mobile.

### Current-year overlay

The current year—for example `[2026]`—does not open a new section. It places a
short statement over the current page like an editorial caption. The year is
derived from the current date and updates automatically when the year changes. The
page remains visible underneath the subdued overlay.

The overlay can be closed by selecting the backdrop, pressing Escape, or using a
visible close action on mobile. Focus and scroll behavior must remain accessible.

### Session intro

On the first INDEX visit of a browser session, a five-frame gallery reveal is
shown:

1. a blank white viewport with five small outlined squares in the center
2. the squares fill one after another while the initial gallery images decode
3. all five frames expand into the exact positions of the initially visible
   gallery cards—three complete cards and two cropped edge cards on desktop
4. the photographs fade into the frames while they expand
5. once the frames settle, the white layer fades away to hand control to the
   real gallery

The target rectangles are measured from the rendered gallery instead of being
hard-coded, so the transition adapts to the current viewport. A bounded loading
fallback prevents the intro from blocking the page. `sessionStorage` limits it
to once per session, and a reduced-motion variant removes the large expansion.

## Design system

The visual language draws from fashion editorials, contact sheets, gallery indexes,
and restrained art direction.

- monochrome interface; photographs retain their intended color
- transparent, almost invisible navigation without containers, shadows, or blur
- neutral grotesque typeface, preferably Instrument Sans
- Instrument Serif used only as an occasional editorial accent
- generous whitespace and a conceptual 12-column grid
- no radii, card borders, or decorative image containers
- native aspect ratios and as little visible gallery chrome as possible

Motion is purposeful: micro-interactions remain short, page transitions remain
calm, and the session intro is the strongest motion moment. The complete experience
must work with `prefers-reduced-motion`, keyboard input, and touch.

## Content model

The central content entity is a **shooting**. Photographs belong to a shooting,
INDEX curates shootings, and LOOKBOOK displays selected photographs across all
shootings.

```text
SHOOTING 1 ──────────── * PHOTO
    │
    └── coverPhoto ──────→ PHOTO
```

A shooting contains a title, slug, year, optional credits, publication status,
INDEX visibility, and a cover image. A photograph stores its image URL,
dimensions, orientation, alternative text, caption, order, and visibility within
the lookbook and shooting.

The hierarchy is deliberately selective:

```text
INDEX    = strongest covers from selected series
LOOKBOOK = broader selection across all published work
SHOOTING = complete selected series
```

A shooting can only be published when it has a title, unique slug, year, and at
least one image. A cover is additionally required for any shooting shown on INDEX.

## Studio

A protected area under `/studio` will make content management possible without
code changes. Its interface remains neutral and monochrome, but prioritizes clarity
and usability over the extreme restraint of the public website.

Planned workflow:

1. sign in to the Studio
2. create a shooting and enter its metadata
3. upload multiple images
4. reorder images via drag and drop
5. select the cover and lookbook visibility
6. choose INDEX visibility
7. preview the draft
8. publish or unpublish it

Published content automatically appears on its shooting page, in LOOKBOOK, and—if
selected—on INDEX. Drafts remain publicly inaccessible.

The hidden Studio link in the footer is only a visual choice. Real server-side
authentication and authorization protect every mutation; there is no public
registration and no credential data in the frontend.

## Technical architecture

The intended production architecture is:

- Next.js App Router and TypeScript
- handwritten CSS for the public experience
- Motion for React only where it meaningfully simplifies transitions
- Vercel for hosting and preview deployments
- Vercel Blob for photographs
- Postgres, preferably Neon, for metadata and publication state
- Drizzle ORM as a lightweight TypeScript database layer
- server-side sessions for the protected Studio

Phase 1 already runs on Next.js with the App Router and static local content. The
server-side work—authentication, uploads, and database access—will be introduced
from Phase 2 onward.

Motion for React is imported from `motion/react` for the session intro,
current-year overlay, and subtle page transitions. The more complex gallery motion
deliberately remains under direct `requestAnimationFrame` control.

## MVP

The first complete release includes:

- responsive INDEX gallery
- LOOKBOOK and PROFILE
- dynamic shooting pages
- session intro and dynamic current-year overlay
- protected Studio login
- shooting management with draft and publication states
- image upload, sorting, and deletion
- cover selection and separate INDEX/LOOKBOOK visibility
- performance, accessibility, SEO, and social-sharing foundations
- deployment to Vercel

Possible later additions include lookbook filters, manual image layouts,
shared-element transitions, a comp-card download, multiple administrators, private
draft images, advanced image processing, analytics, and content scheduling.

## Roadmap

1. Phase 0 — prepare real content and three representative shootings: complete
2. Phase 1 — build and validate the static public experience: complete
3. Phase 2 — connect the Postgres data model and dynamic content
4. Phase 3 — integrate image storage and the upload workflow
5. Phase 4 — implement Studio authentication
6. Phase 5 — build the shooting editor and publishing workflow
7. Phase 6 — refine motion, mobile behavior, and visual details
8. Phase 7 — complete performance, accessibility, SEO, and deployment work

The public visual experience is validated first. The backend and Studio should
support that experience rather than determine its design.

## Current status

- Phase 0: real content for three shootings prepared locally
- Phase 1: static visual prototype implemented
- Next.js App Router, TypeScript, Instrument Sans/Serif, and handwritten CSS
- responsive INDEX gallery with looping, dragging, wheel control, momentum,
  parallax, centering, keyboard control, and position restoration
- LOOKBOOK, PROFILE, and three statically generated shooting pages
- English as the default language and German as the secondary UI/content language
- session intro, dynamic current year, and editorial year overlay
- local photographs excluded from the repository through `.gitignore`
- `npm audit` reports no known vulnerabilities

## Project structure

```text
.
├── app/                  Next.js routes, layouts, metadata, and global styles
├── components/
│   ├── providers/        Shared client-side context providers
│   └── public/           Components for the public portfolio
├── lib/                  Content, translations, types, and shared utilities
├── public/               Public static assets
│   └── media/            Locally synced photographs; ignored by Git
├── scripts/              Repository and local-content utilities
├── content-preparation/  Private source content; local and ignored by Git
└── docs/                 Local product and implementation documentation
```

The root-level `app/`, `components/`, and `lib/` directories are intentional.
Next.js supports both a root-level `app/` directory and the optional
`src/app/` alternative. This project uses the root-level convention consistently,
so an additional `src/` directory would add nesting without providing a benefit.

Configuration files such as `next.config.ts`, `tsconfig.json`, and
`package.json` remain in the repository root, as required or expected by their
respective tools.

## Local setup

Node.js `^20.19.0`, `^22.13.0`, or `>=24` and npm are required.

```bash
npm install
npm run media:sync
npm run dev
```

`npm run media:sync` copies private local photographs from
`content-preparation/` to `public/media/`. Both directories are ignored and are
not pushed. A deployment will therefore display the images only after Phase 3
replaces these local paths with Blob URLs.

Before committing implementation changes, run:

```bash
npm run lint
npm run format:check
npm run build
```

## Local project documentation

The concept and content files deliberately remain local and are not part of the
public repository:

- [`docs/00_MASTER_CONCEPT.md`](docs/00_MASTER_CONCEPT.md) — vision and overall
  experience
- [`docs/01_DESIGN_LANGUAGE.md`](docs/01_DESIGN_LANGUAGE.md) — visual language
  and accessibility
- [`docs/02_PAGES_AND_INTERACTIONS.md`](docs/02_PAGES_AND_INTERACTIONS.md) —
  pages, routes, and interactions
- [`docs/03_TECHNICAL_ARCHITECTURE_AND_ADMIN.md`](docs/03_TECHNICAL_ARCHITECTURE_AND_ADMIN.md)
  — target architecture and Studio
- [`docs/04_DATA_MODEL.md`](docs/04_DATA_MODEL.md) — shooting, photograph, and
  publication model
- [`docs/05_IMPLEMENTATION_ROADMAP.md`](docs/05_IMPLEMENTATION_ROADMAP.md) —
  implementation phases and MVP
- [`docs/06_PORT_FROM_PERSONAL_PORTFOLIO.md`](docs/06_PORT_FROM_PERSONAL_PORTFOLIO.md)
  — reuse of the existing gallery and motion logic
