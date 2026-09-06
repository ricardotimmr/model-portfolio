# Model Portfolio Website — Technical Architecture & Admin

## 1. Recommended Stack

### Frontend / full-stack framework

**Next.js App Router + TypeScript**

Reason:
- React remains the component model
- the existing gallery can be ported with limited changes
- dynamic shooting routes are natural
- authentication and protected server actions are easier than in a pure SPA
- image delivery integrates well with Vercel
- public pages and Studio can live in the same project

### Styling

Either:
- CSS Modules / normal CSS, closest to the existing portfolio

or:
- Tailwind only if desired for Studio speed

Recommended:
> Keep the public website in handcrafted CSS and optionally use utility classes only for the Studio.

### Motion

Reuse:
- GSAP where a precise reveal timeline is useful
- native `requestAnimationFrame` logic from the existing gallery
- Framer Motion only where it genuinely simplifies route/layout transitions

Do not add multiple motion systems to every component.

### Hosting

**Vercel**

### Image/object storage

**Vercel Blob**

Store the actual uploaded photographs in object storage.

Do not store image binary data directly in Postgres.

### Database

**Postgres through the Vercel Marketplace**, with Neon as a strong default.

Use the database only for:
- shootings
- photo metadata
- ordering
- visibility flags
- captions
- credits
- admin/content state

### ORM

Recommended:
> Drizzle ORM

Reasons:
- lightweight
- TypeScript-first
- simple schema for this project
- minimal overhead

Prisma is also valid, but this app does not require its heavier abstraction.

---

## 2. Why Not Keep Pure Vite?

The existing personal portfolio is a React + Vite SPA and is a good source for interaction code.

A pure Vite version of the model site is possible, but once the following features are added:

- login
- protected admin routes
- uploads
- server-side credentials
- database writes
- image deletion
- draft/publish states
- dynamic content

the project needs a server layer anyway.

With Vite, this would mean separately maintaining Vercel Functions/API endpoints.

Next.js gives those responsibilities one coherent structure.

---

## 3. Existing Portfolio Code to Reuse

The existing repository already contains the most difficult interaction work.

### Reuse conceptually/directly

#### Gallery

Current source:

```text
src/components/sections/GallerySection/
```

Useful existing behavior:
- repeated-set infinite track
- normalized position
- inertial animation
- pointer dragging
- momentum
- wheel normalization
- center detection
- focus-to-center behavior
- click centered item to navigate
- per-image parallax
- persisted gallery position

### Required gallery changes

Current:
```ts
PROJECTS
project.slug
navigate(`/work/${projectSlug}`)
```

New:
```ts
shootings
shooting.slug
router.push(`/shoots/${shooting.slug}`)
```

The component should receive its slides as props rather than import static project data.

Example concept:

```ts
type IndexSlide = {
  shootingId: string
  slug: string
  orientation: 'portrait' | 'landscape'
  cover: {
    url: string
    width: number
    height: number
    alt: string
  }
}
```

Then:

```tsx
<IndexGallery slides={slides} />
```

### Reuse session intro logic

The personal portfolio already checks `sessionStorage` to decide whether its loader played during the current session.

Keep that mechanism.

Replace the current loader content with the shorter photographic reveal.

### Reuse `[2026]` overlay structure

The personal portfolio navbar already:
- stores open state
- locks body scroll
- closes with Escape
- renders a centered overlay

Reuse the behavior while redesigning the visual treatment.

---

## 4. Suggested Project Structure

```text
app/
├── layout.tsx
├── page.tsx                         # INDEX
├── archive/
│   └── page.tsx
├── profile/
│   └── page.tsx
├── shoots/
│   └── [slug]/
│       └── page.tsx
├── studio/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── login/
│   │   └── page.tsx
│   └── shootings/
│       ├── new/
│       │   └── page.tsx
│       └── [id]/
│           └── page.tsx
└── api/
    └── ...

components/
├── public/
│   ├── navbar/
│   ├── index-gallery/
│   ├── year-overlay/
│   ├── intro/
│   ├── archive-grid/
│   ├── shooting-layout/
│   └── footer/
└── studio/
    ├── upload-dropzone/
    ├── photo-sorter/
    ├── shooting-form/
    └── publish-controls/

db/
├── schema.ts
├── queries.ts
└── mutations.ts

lib/
├── auth.ts
├── blob.ts
├── images.ts
└── slug.ts

public/
└── static/
```

---

## 5. Authentication

The admin entry may be visually hidden, but authentication must be genuine.

### MVP recommendation

Only one administrator account is required.

Use:
- Auth.js or an equivalent server-side session solution
- credentials login
- password hash stored securely, never plain text
- signed/encrypted HTTP-only session cookie
- server-side authorization on every Studio mutation

The UI may ask for:

```text
EMAIL / USERNAME
PASSWORD
```

No public registration.

No password reset flow is necessary for MVP if the administrator is controlled by the site owner.

### Alternative

If both developer and model should have their own account later:
- create an `admins` table
- role field
- invite-only creation

### Critical rule

Never rely on:
- route obscurity
- client-side state
- JavaScript-only route guards
- a password shipped in frontend environment variables

Every write must be protected on the server.

---

## 6. Studio Dashboard

Route:

```text
/studio
```

### Dashboard list

Each shooting row/card shows:
- cover thumbnail
- title
- date
- status
- INDEX featured status
- photo count
- edit
- preview

Primary button:

```text
NEW SHOOTING
```

### Studio visual language

The Studio does not need to be invisible.

It should be:
- clean
- neutral
- practical
- readable
- still monochrome

Use obvious controls here.

Public minimalism should never reduce admin usability.

---

## 7. Create Shooting Flow

### Step 1 — Metadata

Fields:

```text
Title *
Slug *
Date / Year *
Location
Description
Photographer
Styling
Makeup
Hair
Client / Publication
Credits
```

Slug auto-generates from title but stays editable.

### Step 2 — Images

Drag/drop multiple images.

For each upload:
- upload file to Blob
- read/store width
- read/store height
- derive orientation
- create DB photo record

### Step 3 — Arrange

Drag photos into correct order.

Choose:
- cover image
- archive visibility
- optional caption
- optional alt text

### Step 4 — Publishing

Controls:

```text
Draft / Published
Featured on INDEX
Archive visible
```

Preview before publish.

---

## 8. Upload Strategy

### Accepted formats

Recommended:
- JPEG
- PNG
- WebP
- AVIF

Do not support RAW camera formats in MVP.

### Suggested upload constraints

- max file size configurable, e.g. 15–25 MB
- reject unsupported MIME types server-side
- sanitize file naming
- generate unique Blob keys

Example Blob path:

```text
shootings/{shootingId}/{uuid}-{safeFilename}
```

### Image preparation

For MVP:
- store high-quality web-ready source images
- serve through the framework/image optimization pipeline

Recommended creator workflow:
- export web-quality JPEG/WebP
- long edge around 3000–4000 px
- sRGB
- avoid uploading 50–100 MB originals

Later:
- server-side image derivative generation
- blur placeholder generation
- automatic EXIF stripping if desired

---

## 9. Public / Private Blob Choice

Portfolio images are intended to be publicly visible once published.

A public Blob store is therefore sufficient for published assets.

If draft shoots must remain completely inaccessible before publishing:
- private Blob storage is the stronger architecture
- authenticated image delivery becomes more complex

Pragmatic MVP:
- public Blob URLs
- unlisted draft content not linked publicly

Stronger later version:
- private draft storage
- copy/promote to public storage on publish

---

## 10. Publishing Logic

A shooting is publicly visible only when:

```text
status = 'published'
```

INDEX query:

```text
published
AND featuredOnIndex = true
ORDER BY indexOrder
```

ARCHIVE query:

```text
published shootings
AND photo.archiveVisible = true
ORDER BY shooting.date DESC, photo.sortOrder ASC
```

Detail page:

```text
published shooting by slug
+ its published/visible photos ordered by sortOrder
```

Draft:
- accessible only in authenticated Studio preview

---

## 11. Delete Behavior

Never instantly hard-delete uploaded content from the UI without confirmation.

Recommended:

### Delete photo
1. remove DB association / mark deleting
2. delete Blob object
3. remove DB row

### Delete shooting
If it has photos:
- require explicit confirmation
- list number of photos affected

Possible safer model:
- archive shooting first
- hard delete as a second action

---

## 12. Ordering

INDEX has an explicit order separate from chronological date.

Fields:

```text
featuredOnIndex boolean
indexOrder integer
```

This allows the curator to place the strongest shoots first.

Within a shooting:

```text
photo.sortOrder integer
```

ARCHIVE can remain chronological by shooting while preserving configured photo order.

---

## 13. Performance

Image-heavy portfolios need deliberate performance work.

### INDEX

- only fetch featured shooting covers
- preload the first visible images
- do not preload every archive photograph
- responsive image sizes
- limit layout shift with width/height metadata

### ARCHIVE

- lazy load below the fold
- server-render metadata
- paginate or progressively load if archive grows very large

A first version can load approximately 50–100 images if sizes are carefully optimized, but do not architect around unlimited eager loading.

### Shooting pages

- first image priority
- later images lazy
- preserve width/height
- provide `sizes` hints

---

## 14. Caching / Revalidation

Public portfolio content changes infrequently.

Recommended:
- cache public read queries
- revalidate relevant routes after Studio mutations

When a shooting is published or edited:

```text
revalidate /
revalidate /archive
revalidate /shoots/{slug}
```

This keeps normal visitors on fast cached pages while admin changes appear quickly.

---

## 15. SEO / Sharing

Each shooting should have metadata:

```text
title
description
Open Graph image = cover
canonical URL
```

PROFILE:
- model name
- location
- portfolio description

ARCHIVE:
- descriptive title, not just "Archive"

INDEX:
- model name + "Model Portfolio"

If this portfolio is primarily shared directly with agencies/clients, SEO can stay minimal, but correct social preview metadata is still useful.

---

## 16. Privacy / Analytics

Keep analytics optional.

If analytics is added:
- use a privacy-conscious solution
- do not let tracking delay initial image rendering

Do not add marketing scripts by default.

---

## 17. Vercel Deployment

Recommended deployment model:

```text
GitHub
  ↓
Vercel project
  ↓
Preview deployment per branch/PR
  ↓
Production domain
```

Environment variables contain:
- database connection
- Blob token
- auth secret
- admin credential/hash configuration as applicable

Never commit these values.

---

## 18. MVP Definition

The MVP is complete when:

- INDEX reads featured shootings from DB
- infinite gallery works
- each cover opens a shooting page
- ARCHIVE shows all enabled photos
- PROFILE works
- `[2026]` overlay works
- intro runs once per session
- admin can sign in
- admin can create/edit shootings
- admin can upload/reorder/delete photos
- admin can choose cover
- admin can feature/unfeature shoot
- admin can publish/unpublish
- site deploys to Vercel
