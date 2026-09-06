import projectContent from '../content/projects/projects.json'

export type ProjectOrientation = 'landscape' | 'portrait'

export type ResponsiveProjectImage = {
  alt: string
  src: string
  jpegSrcSet?: string
  webpSrcSet?: string
  avifSrcSet?: string
  sizes: string
}

export type ProjectNarrativeContent = {
  overviewHeadline: string
  overviewMeta: string
  processHeadline: string
  processMeta: string
}

export type ProjectRecord = {
  id: string
  slug: string
  title: string
  orientation: ProjectOrientation
  description: string
  roles: string[]
  visitUrl?: string
  imageSrc: string
  thumbnailImage: ResponsiveProjectImage
  heroImage: ResponsiveProjectImage
  detailImages: [ResponsiveProjectImage, ResponsiveProjectImage, ResponsiveProjectImage, ResponsiveProjectImage]
  narrative: ProjectNarrativeContent
}

type ProjectContentRecord = {
  id: string
  slug: string
  title: string
  orientation: ProjectOrientation
  description: string
  roles: string[]
  visitUrl?: string
  detail: ProjectNarrativeContent
  assets: {
    folder: string
    fallbackThumbnail: string
    fallbackDetails: [string, string, string, string]
  }
}

type ProjectImageSlot = 'thumbnail' | 'detail-01' | 'detail-02' | 'detail-03' | 'detail-04'

type GeneratedVariant = {
  width: number
  src: string
}

type GeneratedVariantSet = {
  avif: GeneratedVariant[]
  webp: GeneratedVariant[]
  jpeg: GeneratedVariant[]
}

const thumbnailSizes = '(max-width: 900px) 88vw, 520px'
const detailSizes = '(max-width: 900px) 94vw, 1600px'

const generatedModules = import.meta.glob('../assets/projects/generated/**/*.{avif,webp,jpg,jpeg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const fallbackHorizontalModules = import.meta.glob(
  '../assets/projects/horizontal/*.{png,jpg,jpeg,webp,avif}',
  {
    eager: true,
    import: 'default',
  },
) as Record<string, string>

const fallbackVerticalModules = import.meta.glob(
  '../assets/projects/vertical/*.{png,jpg,jpeg,webp,avif}',
  {
    eager: true,
    import: 'default',
  },
) as Record<string, string>

const fallbackOptimizedHorizontalModules = import.meta.glob(
  '../assets/projects-optimized/horizontal/*.{png,jpg,jpeg,webp,avif}',
  {
    eager: true,
    import: 'default',
  },
) as Record<string, string>

const fallbackOptimizedVerticalModules = import.meta.glob(
  '../assets/projects-optimized/vertical/*.{png,jpg,jpeg,webp,avif}',
  {
    eager: true,
    import: 'default',
  },
) as Record<string, string>

const generatedVariantIndex = buildGeneratedVariantIndex(generatedModules)
const fallbackSourceByFileName = buildFallbackSourceMap()

function buildGeneratedVariantIndex(modules: Record<string, string>) {
  const index = new Map<string, GeneratedVariantSet>()

  Object.entries(modules).forEach(([modulePath, source]) => {
    const match = modulePath.match(
      /\.\.\/assets\/projects\/generated\/([^/]+)\/(thumbnail|detail-0[1-4])-w(\d+)\.(avif|webp|jpe?g)$/,
    )

    if (!match) {
      return
    }

    const [, folder, slot, widthText, format] = match
    const width = Number.parseInt(widthText, 10)
    if (!Number.isFinite(width)) {
      return
    }

    const key = `${folder}::${slot}`
    const existing =
      index.get(key) ?? {
        avif: [],
        webp: [],
        jpeg: [],
      }

    const variant = { width, src: source }
    if (format === 'avif') {
      existing.avif.push(variant)
    } else if (format === 'webp') {
      existing.webp.push(variant)
    } else {
      existing.jpeg.push(variant)
    }

    index.set(key, existing)
  })

  index.forEach((entry) => {
    entry.avif.sort((a, b) => a.width - b.width)
    entry.webp.sort((a, b) => a.width - b.width)
    entry.jpeg.sort((a, b) => a.width - b.width)
  })

  return index
}

function buildFallbackSourceMap() {
  const result = new Map<string, string>()

  const register = (modules: Record<string, string>) => {
    Object.entries(modules).forEach(([modulePath, source]) => {
      const fileName = modulePath.split('/').at(-1)
      if (!fileName) {
        return
      }

      result.set(fileName, source)
    })
  }

  register(fallbackHorizontalModules)
  register(fallbackVerticalModules)
  register(fallbackOptimizedHorizontalModules)
  register(fallbackOptimizedVerticalModules)

  return result
}

function toSrcSet(variants: GeneratedVariant[]) {
  if (variants.length === 0) {
    return undefined
  }

  return variants.map((variant) => `${variant.src} ${variant.width}w`).join(', ')
}

function resolveProjectImage(
  folder: string,
  slot: ProjectImageSlot,
  fallbackFileName: string,
  sizes: string,
  alt: string,
): ResponsiveProjectImage {
  const generated = generatedVariantIndex.get(`${folder}::${slot}`)
  const fallbackSource = fallbackSourceByFileName.get(fallbackFileName)

  const jpegSource = generated?.jpeg.at(-1)?.src ?? fallbackSource
  const webpSrcSet = toSrcSet(generated?.webp ?? [])
  const avifSrcSet = toSrcSet(generated?.avif ?? [])
  const jpegSrcSet = toSrcSet(generated?.jpeg ?? [])

  if (!jpegSource) {
    throw new Error(`Missing fallback image source for "${fallbackFileName}".`)
  }

  return {
    alt,
    src: jpegSource,
    jpegSrcSet,
    webpSrcSet,
    avifSrcSet,
    sizes,
  }
}

function normalizeVisitUrl(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function isProjectRecord(value: unknown): value is ProjectContentRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<ProjectContentRecord>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.slug === 'string' &&
    typeof candidate.title === 'string' &&
    (candidate.orientation === 'landscape' || candidate.orientation === 'portrait') &&
    Array.isArray(candidate.roles) &&
    typeof candidate.description === 'string' &&
    Boolean(candidate.detail) &&
    Boolean(candidate.assets)
  )
}

function buildProjects() {
  const input = projectContent as unknown
  if (!Array.isArray(input)) {
    throw new Error('Project content must be an array.')
  }

  return input.filter(isProjectRecord).map((project) => {
    const thumbnailImage = resolveProjectImage(
      project.assets.folder,
      'thumbnail',
      project.assets.fallbackThumbnail,
      thumbnailSizes,
      `${project.title} thumbnail`,
    )

    const heroImage = resolveProjectImage(
      project.assets.folder,
      'thumbnail',
      project.assets.fallbackThumbnail,
      detailSizes,
      `${project.title} hero image`,
    )

    const detailImages = [
      resolveProjectImage(
        project.assets.folder,
        'detail-01',
        project.assets.fallbackDetails[0],
        detailSizes,
        `${project.title} detail visual 1`,
      ),
      resolveProjectImage(
        project.assets.folder,
        'detail-02',
        project.assets.fallbackDetails[1],
        detailSizes,
        `${project.title} detail visual 2`,
      ),
      resolveProjectImage(
        project.assets.folder,
        'detail-03',
        project.assets.fallbackDetails[2],
        detailSizes,
        `${project.title} detail visual 3`,
      ),
      resolveProjectImage(
        project.assets.folder,
        'detail-04',
        project.assets.fallbackDetails[3],
        detailSizes,
        `${project.title} detail visual 4`,
      ),
    ] as [
      ResponsiveProjectImage,
      ResponsiveProjectImage,
      ResponsiveProjectImage,
      ResponsiveProjectImage,
    ]

    return {
      id: project.id,
      slug: project.slug,
      title: project.title,
      orientation: project.orientation,
      description: project.description,
      roles: [...project.roles],
      visitUrl: normalizeVisitUrl(project.visitUrl),
      imageSrc: thumbnailImage.src,
      thumbnailImage,
      heroImage,
      detailImages,
      narrative: {
        overviewHeadline: project.detail.overviewHeadline,
        overviewMeta: project.detail.overviewMeta,
        processHeadline: project.detail.processHeadline,
        processMeta: project.detail.processMeta,
      },
    }
  })
}

export const PROJECTS: ProjectRecord[] = buildProjects()

export function getProjectBySlug(slug: string) {
  return PROJECTS.find((project) => project.slug === slug) ?? null
}
