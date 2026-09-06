# Personal Portfolio — Reuse Export

Archive: `personal-portfolio-reuse-export-2026-09-06.zip`

This archive is the source export described by
`06_PORT_FROM_PERSONAL_PORTFOLIO.md`. It contains the current implementation,
not a Next.js rewrite. Paths inside the archive match the paths in this
repository so imports and relationships stay understandable.

## Port first

### INDEX gallery

- `src/components/sections/GallerySection/GallerySection.tsx`
- `src/components/sections/GallerySection/GallerySection.css`
- `src/components/navigation/SmoothScroll/scrollPhysics.ts`
- `src/components/navigation/SmoothScroll/normalizeWheelDelta.ts`
- `tests/unit/normalizeWheelDelta.test.ts`

This is the complete current gallery implementation: repeated sets, infinite
position normalization, wheel input, pointer drag, velocity smoothing, release
momentum, center detection, click-to-center, persisted track position and image
parallax.

For the model portfolio, turn the internal `PROJECTS` lookup into a `slides`
prop, replace `useNavigate` with the Next.js router and rename the portfolio
domain terms. The gallery imports the current project types and responsive
image component, so those reference files are included too.

### Intro session behavior

- `src/App.tsx`
- `src/components/overlay/InitialLoader/InitialLoader.tsx`
- `src/components/overlay/InitialLoader/InitialLoader.css`
- `src/components/overlay/shared/pageMotionEase.ts`
- `src/assets/videos/loading-screen-bike.gif`

The reusable part is the guarded `sessionStorage` flow in `App.tsx`. Change the
key from `portfolio:intro-played` to `model-portfolio:intro-played`. The current
bike loader is included only so the reveal callbacks and lifecycle can be
traced; its visual treatment should be replaced by the planned photographic
slit reveal.

### Year overlay behavior

- `src/components/layout/Navbar/Navbar.tsx`
- `src/components/layout/Navbar/Navbar.css`
- `src/hooks/useTheme.ts`

The useful portion is the `[2026]` overlay: local open state, Escape handling,
body scroll lock, backdrop close and event propagation inside the dialog. The
rest of the developer-portfolio navbar is reference material and should not be
ported as the new visual design.

## Evaluate before porting

### Page transition

- `src/components/overlay/PageTransition/PageTransition.tsx`
- `src/components/overlay/PageTransition/PageTransition.css`
- `src/components/overlay/shared/pageMotionEase.ts`
- `src/utils/browser.ts`
- `tests/unit/browser.test.ts`

Start with a minimal route fade in the new repository. These files are included
as an optional reference if that result feels too plain.

### Responsive images

- `src/components/common/ResponsiveImage.tsx`
- `src/data/projects.ts`
- `src/content/projects/projects.json`

Use these to understand the current source-set contract. Prefer `next/image`
for the new application and preserve URL, width, height and alt text in the new
data model. Generated project image binaries are intentionally not bundled.

## Supporting project metadata

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tsconfig.app.json`
- `docs/06_PORT_FROM_PERSONAL_PORTFOLIO.md`

These make framework assumptions and exact dependency versions visible. The
archive does not represent a standalone runnable project; it is a selective
source handoff for a clean Next.js repository.

## Intentionally excluded

- `SmoothScroll` and Lenis runtime: native scrolling should be tested first.
- `CursorTrail`: the new site should remain quieter.
- Project image binaries: they are portfolio-specific and unnecessarily large.
- The full application, pages, copy, theme system and visual identity.
- Fonts and portfolio-specific branding assets.

## Suggested extraction order

1. Extract the archive next to the new repository, not over it.
2. Port wheel normalization and gallery physics first.
3. Convert the gallery to receive typed shooting data through props.
4. Add the session-only intro guard around the new slit reveal.
5. Extract the year overlay mechanics into the simpler new navbar.
6. Add a minimal route fade; consult the exported transition only if needed.
7. Rebuild image rendering around `next/image` and remote image metadata.

