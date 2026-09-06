# Model Portfolio Website — Data Model

## 1. Principle

The data model should reflect the editorial structure:

> A shooting is the main content object.  
> Photos belong to shootings.  
> INDEX features shootings.  
> ARCHIVE displays photos across shootings.

This avoids manually creating separate pages.

Creating and publishing a shooting automatically creates its public detail route through the dynamic route system.

---

# 2. Shooting

Suggested conceptual schema:

```ts
type Shooting = {
  id: string
  slug: string
  title: string

  description?: string | null
  location?: string | null

  shootDate?: Date | null
  year: number

  photographer?: string | null
  styling?: string | null
  makeup?: string | null
  hair?: string | null
  client?: string | null
  credits?: string | null

  coverPhotoId?: string | null

  featuredOnIndex: boolean
  indexOrder?: number | null

  status: 'draft' | 'published' | 'archived'

  createdAt: Date
  updatedAt: Date
  publishedAt?: Date | null
}
```

## Required MVP fields

- id
- slug
- title
- year
- status
- featuredOnIndex
- createdAt
- updatedAt

Cover photo becomes required before publishing if the shooting is featured.

---

# 3. Photo

```ts
type Photo = {
  id: string
  shootingId: string

  blobUrl: string
  blobPathname: string

  originalFilename?: string | null
  width: number
  height: number
  aspectRatio: number
  orientation: 'portrait' | 'landscape' | 'square'

  alt?: string | null
  caption?: string | null

  sortOrder: number

  archiveVisible: boolean
  shootingVisible: boolean

  layoutHint?: 
    | 'auto'
    | 'full'
    | 'wide'
    | 'medium'
    | 'left'
    | 'right'
    | 'pair-next'

  createdAt: Date
  updatedAt: Date
}
```

---

# 4. Profile

The PROFILE page can initially remain code/config-driven if it changes rarely.

If it should be editable in Studio, add:

```ts
type Profile = {
  id: string
  modelName: string
  bio?: string | null

  base?: string | null
  height?: string | null
  bust?: string | null
  waist?: string | null
  hips?: string | null
  shoe?: string | null
  hair?: string | null
  eyes?: string | null

  agency?: string | null
  email?: string | null
  instagram?: string | null

  portraitPhotoId?: string | null

  updatedAt: Date
}
```

Recommendation:
- keep PROFILE content in code during phase 1
- make it editable only after the shooting workflow is stable

---

# 5. Site Settings

Optional later table:

```ts
type SiteSettings = {
  id: string

  yearOverlayTitle?: string | null
  yearOverlayText?: string | null

  instagramUrl?: string | null
  contactEmail?: string | null

  introEnabled: boolean
}
```

This allows `[2026]` text and global links to change without code.

Not required for first implementation.

---

# 6. Admin User

For one-admin MVP, a DB user table can be avoided if authentication uses one controlled credential configured securely.

If multiple administrators are needed:

```ts
type AdminUser = {
  id: string
  email: string
  name?: string | null
  role: 'owner' | 'editor'
  createdAt: Date
}
```

Never store plain-text passwords.

---

# 7. Relationships

```text
SHOOTING
  1
  │
  └─────────────── *
                   PHOTO

SHOOTING.coverPhotoId ─────→ PHOTO.id
```

Rules:

- cover photo should belong to the same shooting
- deleting a cover photo must require selecting a replacement if shooting is featured
- a photo cannot exist publicly without a parent shooting
- archived/draft shooting photos do not appear in public queries

---

# 8. Slugs

Examples:

```text
coastal-light
studio-no-03
copenhagen-test
winter-editorial
```

Slug generation:

```text
Title: "Coastal Light"
→ coastal-light
```

If duplicate:

```text
coastal-light-2
```

Once published, avoid changing slugs casually because external links may exist.

If a slug changes later:
- preserve old slug in redirect table or create redirect mapping

Not required for MVP.

---

# 9. INDEX Data Shape

The public INDEX component does not need the full shooting record.

Return only:

```ts
type IndexShooting = {
  id: string
  slug: string
  title: string
  year: number
  cover: {
    id: string
    url: string
    width: number
    height: number
    alt: string | null
  }
}
```

This keeps the homepage query small.

---

# 10. ARCHIVE Data Shape

```ts
type ArchivePhoto = {
  id: string
  url: string
  width: number
  height: number
  alt: string | null

  shooting: {
    slug: string
    title: string
    year: number
  }
}
```

---

# 11. Shooting Detail Data Shape

```ts
type ShootingDetail = {
  slug: string
  title: string
  description: string | null
  location: string | null
  year: number

  credits: {
    photographer?: string
    styling?: string
    makeup?: string
    hair?: string
    client?: string
  }

  photos: Array<{
    id: string
    url: string
    width: number
    height: number
    alt: string | null
    caption: string | null
    layoutHint: string
  }>
}
```

---

# 12. Publish Validation

Before status can become `published`:

Required:
- title exists
- slug exists and is unique
- year exists
- at least one photo exists

If `featuredOnIndex = true`:
- coverPhotoId is required

Validation error example:

```text
This shooting cannot be published yet:
• Select a cover photo.
• Add at least one image.
```

---

# 13. Archive Visibility

Photo-level `archiveVisible` is useful because not every photo from a shooting necessarily belongs in the global archive.

Example:

A shooting has 18 images.

- 18 shown on shooting page
- 8 selected for ARCHIVE
- 1 selected as INDEX cover

This creates a useful hierarchy:

```text
INDEX   = strongest series covers
ARCHIVE = broad selected image history
SHOOT   = complete selected series
```

---

# 14. Optional Categories

Do not add categories until needed.

Possible future field:

```ts
type ShootingCategory =
  | 'editorial'
  | 'test'
  | 'commercial'
  | 'beauty'
  | 'runway'
  | 'personal'
```

This can later power Archive filters.

For MVP, leave it out unless real content already needs it.

---

# 15. Optional Credits Model

Simple MVP:
- credits are fields on Shooting

If credits become more complex later:

```ts
type Credit = {
  id: string
  shootingId: string
  role: string
  name: string
  url?: string
  order: number
}
```

This allows arbitrary credit types without schema changes.

Do not start with this unless necessary.

---

# 16. Deletion Rules

Photo deletion:
- delete object from Blob
- delete Photo row
- adjust sort order
- clear coverPhotoId if required

Shooting deletion:
- explicit confirmation
- delete all child Blob objects
- delete photos
- delete shooting

Safer alternative:
- `archived` status for normal removal
- permanent deletion hidden behind a second action

Recommended:
> Archive first, hard-delete only intentionally.
