# Model Portfolio Website — Implementation Roadmap

## Phase 0 — Content Preparation

Before development decisions become permanent, collect:

- model name as displayed publicly
- 2–3 real shootings for the first visual prototype
- one candidate cover per shooting
- one profile portrait
- image orientation mix
- basic profile information
- Instagram/contact information
- desired domain

Use real photography as early as possible.

A gallery tuned with placeholder images often feels different once actual portrait photography is inserted.

Two shootings are enough to validate image sizing, mixed orientations, the detail
page and the core gallery interaction; a third provides more useful visual variety.
During the prototype, the infinite gallery can render repeated slide sets from this
small selection. More shootings should be added before final curation and
performance tuning, but they are not a blocker for starting Phase 1.

---

# Phase 1 — Static Visual Prototype

## Goal

Build the public design without backend complexity.

### Tasks

1. create new Next.js + TypeScript repository
2. set global monochrome tokens
3. implement typography
4. create almost-invisible navbar
5. port gallery behavior from personal portfolio
6. replace project data with temporary shooting objects
7. implement session-only intro
8. implement `[2026]` overlay
9. create static ARCHIVE
10. create static PROFILE
11. create one static shooting detail layout
12. implement responsive behavior

### Deliverable

The complete public experience works from local static data.

Do not start the CMS/admin until the gallery and content hierarchy feel right.

---

# Phase 2 — Dynamic Content Layer

## Goal

Replace static shooting data with database content.

### Tasks

1. provision Postgres integration
2. add Drizzle
3. create Shooting schema
4. create Photo schema
5. create migrations
6. seed sample shootings
7. replace INDEX query
8. replace ARCHIVE query
9. implement `/shoots/[slug]`
10. add draft/published state

### Deliverable

Public pages are database-driven.

---

# Phase 3 — Image Storage

## Goal

Move photography out of the repository.

### Tasks

1. create Blob store
2. create upload server action/API
3. validate file type and size
4. upload files
5. store Blob metadata in Photo table
6. store width/height/aspect ratio
7. configure image rendering
8. implement deletion
9. test large photo sets

### Deliverable

No code deployment is required to add a photograph.

---

# Phase 4 — Studio Authentication

## Goal

Create a truly protected content area.

### Tasks

1. implement login
2. create secure session
3. protect `/studio/*`
4. protect every write server-side
5. add logout
6. add unauthenticated redirect
7. verify secrets are only server-side

### Deliverable

Only authenticated admin users can modify portfolio content.

---

# Phase 5 — Studio Shooting Editor

## Goal

Make the full upload/publish workflow browser-based.

### Tasks

1. dashboard shooting list
2. create shooting
3. auto-generate slug
4. upload multiple photos
5. drag reorder
6. select cover image
7. edit metadata/credits
8. select INDEX visibility
9. select photo archive visibility
10. preview draft
11. publish
12. unpublish
13. archive
14. delete with confirmation

### Deliverable

A complete shooting can be created without touching source code.

---

# Phase 6 — Public Polish

## Goal

Turn the functional site into the finished portfolio.

### Tasks

1. tune gallery inertia with real images
2. tune parallax intensity
3. perfect image sizes/gaps
4. refine navbar opacity
5. finalize intro animation timing
6. route transition polish
7. improve mobile INDEX gestures
8. tune ARCHIVE density
9. tune shooting layout rhythm
10. finalize PROFILE typography
11. implement footer
12. add discreet Studio entry

---

# Phase 7 — Performance

### INDEX

- preload only initial/adjacent covers
- responsive `sizes`
- test on mobile Safari
- test trackpad behavior
- test low-end mobile device

### ARCHIVE

- lazy loading
- layout stability
- investigate pagination only if needed

### Shootings

- prioritize first image
- lazy load below
- avoid original full-resolution camera files

### Measure

- Largest Contentful Paint
- Interaction to Next Paint
- Cumulative Layout Shift
- real-device scroll/drag responsiveness

---

# Phase 8 — Accessibility

Checklist:

- keyboard gallery navigation
- Enter to open focused shooting
- visible focus indicator
- overlay Escape close
- correct dialog semantics
- alt text
- reduced motion
- menu focus behavior
- touch target sizes
- no hover-only essential information

---

# Phase 9 — Deployment

1. connect GitHub repository to Vercel
2. configure production environment variables
3. attach database
4. attach Blob store
5. configure custom domain
6. test preview deployment
7. test Studio on production-like environment
8. publish production
9. test image upload after deployment
10. verify draft content cannot appear publicly

---

# Recommended Build Order

Do not build all architecture first.

Recommended sequence:

```text
1. INDEX gallery
2. navbar + [2026]
3. intro
4. shooting detail page
5. ARCHIVE
6. PROFILE
7. database
8. Blob storage
9. authentication
10. Studio
11. polish/performance
```

The site succeeds or fails visually on steps 1–6.

The backend should support that experience, not define it.

---

# MVP vs Later

## MVP

- INDEX
- ARCHIVE
- PROFILE
- dynamic shooting pages
- session intro
- year overlay
- secure admin login
- shooting CRUD
- image upload
- reorder
- cover selection
- publish state
- responsive design

## Later

- Archive filters
- custom photo layout hints
- shared-element transitions
- downloadable comp card
- profile editor
- editable `[2026]` text
- multiple admins
- photographer credit links
- private draft image storage
- advanced image processing
- analytics
- custom contact form
- content scheduling
