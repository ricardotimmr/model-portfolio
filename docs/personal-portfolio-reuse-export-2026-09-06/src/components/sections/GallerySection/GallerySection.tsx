import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GALLERY_SCROLL_INERTIAL_LERP,
  GALLERY_SCROLL_MAX_WHEEL_DELTA,
  GALLERY_SCROLL_WHEEL_DRAG_FACTOR,
} from '../../navigation/SmoothScroll/scrollPhysics'
import { normalizeWheelDeltaToPixels } from '../../navigation/SmoothScroll/normalizeWheelDelta'
import { type ResponsiveProjectImage, PROJECTS } from '../../../data/projects'
import ResponsiveImage from '../../common/ResponsiveImage'
import './GallerySection.css'

type SlideOrientation = 'landscape' | 'portrait'

type GallerySlide = {
  id: string
  orientation: SlideOrientation
  image: ResponsiveProjectImage
  slug: string
}

type CardMetric = {
  mediaElement: HTMLImageElement
  center: number
  halfWidth: number
  lastShift: number
}

const repeatedSetCount = 7
const middleSetIndex = Math.floor(repeatedSetCount / 2)
const textCloseDelayMs = 260
const cardImageParallaxMaxShiftPx = 292
const cardImageParallaxScale = 1.8
const centerHitTestMinIntervalMs = 34
const dragVelocitySmoothing = 0.24
const dragReleaseMomentumMs = 460
const dragReleaseMinVelocity = 0.025
const dragReleaseMaxDistancePx = 1500
const dragReleaseVelocityCap = 1.8
const dragClickThresholdPx = 6
const centerNavigationThresholdPx = 4
const focusCenterInertialLerp = GALLERY_SCROLL_INERTIAL_LERP * 0.62
let persistedGalleryTrackX: number | null = null

type MarkerPhase = 'idle' | 'open' | 'closing'

function buildSlides(): GallerySlide[] {
  return PROJECTS.map((project) => ({
    id: project.id,
    orientation: project.orientation,
    image: project.thumbnailImage,
    slug: project.slug,
  }))
}

function supportsGalleryPointerInteraction(event: ReactPointerEvent<HTMLDivElement>) {
  if (!event.isPrimary) {
    return false
  }

  if (event.pointerType === 'mouse') {
    return event.button === 0
  }

  return event.pointerType === 'touch' || event.pointerType === 'pen'
}

function GallerySection() {
  const navigate = useNavigate()
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const firstSetRef = useRef<HTMLDivElement | null>(null)
  const setWidthRef = useRef(0)
  const currentXRef = useRef(0)
  const targetXRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const closeTextTimeoutRef = useRef<number | null>(null)
  const centerHitRafRef = useRef<number | null>(null)
  const pointerInsideRef = useRef(false)
  const hasPointerPositionRef = useRef(false)
  const pointerXRef = useRef(0)
  const pointerYRef = useRef(0)
  const activePointerIdRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)
  const dragStartClientXRef = useRef(0)
  const dragStartTrackXRef = useRef(0)
  const dragLastClientXRef = useRef(0)
  const dragLastTimeRef = useRef(0)
  const dragVelocityRef = useRef(0)
  const dragMovedRef = useRef(false)
  const isFocusCenterAnimationRef = useRef(false)
  const isCenterHoveringRef = useRef(false)
  const lastCenterHitTestAtRef = useRef(0)
  const cardMetricsRef = useRef<CardMetric[]>([])
  const viewportWidthRef = useRef(0)

  const [markerPhase, setMarkerPhase] = useState<MarkerPhase>('idle')
  const [isCenterHovering, setIsCenterHovering] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const gallerySlides = useMemo(() => buildSlides(), [])
  const uniqueImageSources = useMemo(
    () => Array.from(new Set(gallerySlides.map((slide) => slide.image.src))),
    [gallerySlides],
  )

  const applyTrackTransform = () => {
    const track = trackRef.current
    if (!track) {
      return
    }

    track.style.transform = `translate3d(${-currentXRef.current}px, 0, 0)`
    persistedGalleryTrackX = currentXRef.current
  }

  const updateCardParallax = () => {
    const viewport = viewportRef.current
    const cardMetrics = cardMetricsRef.current
    if (!viewport || cardMetrics.length === 0) {
      return
    }

    const viewportWidth = viewportWidthRef.current || viewport.clientWidth
    if (viewportWidth <= 0) {
      return
    }

    const viewportStart = currentXRef.current
    const viewportEnd = viewportStart + viewportWidth
    const viewportCenterInTrack = currentXRef.current + viewportWidth / 2
    const influenceRange = viewportWidth * 0.64

    cardMetrics.forEach((metric) => {
      const isFarOutsideViewport =
        metric.center + metric.halfWidth < viewportStart - influenceRange ||
        metric.center - metric.halfWidth > viewportEnd + influenceRange

      const nextShift = (() => {
        if (isFarOutsideViewport) {
          return 0
        }

        const ratio = Math.max(
          -1,
          Math.min(1, (metric.center - viewportCenterInTrack) / influenceRange),
        )
        return -ratio * cardImageParallaxMaxShiftPx
      })()

      if (Math.abs(nextShift - metric.lastShift) < 0.35) {
        return
      }

      metric.lastShift = nextShift
      metric.mediaElement.style.transform = `translate3d(${nextShift.toFixed(
        2,
      )}px, 0, 0) scale(${cardImageParallaxScale})`
    })
  }

  const normalizeInfinitePosition = () => {
    const setWidth = setWidthRef.current
    if (setWidth === 0) {
      return
    }

    const anchor = setWidth * middleSetIndex

    while (currentXRef.current < anchor - setWidth) {
      currentXRef.current += setWidth
      targetXRef.current += setWidth
    }

    while (currentXRef.current > anchor + setWidth) {
      currentXRef.current -= setWidth
      targetXRef.current -= setWidth
    }
  }

  const setCenterHovering = (isHoveringCenterCard: boolean) => {
    if (isCenterHoveringRef.current === isHoveringCenterCard) {
      return
    }

    isCenterHoveringRef.current = isHoveringCenterCard
    setIsCenterHovering(isHoveringCenterCard)

    if (closeTextTimeoutRef.current !== null) {
      window.clearTimeout(closeTextTimeoutRef.current)
      closeTextTimeoutRef.current = null
    }

    if (isHoveringCenterCard) {
      setMarkerPhase('open')
      return
    }

    setMarkerPhase((currentPhase) => {
      if (currentPhase === 'idle') {
        return currentPhase
      }

      closeTextTimeoutRef.current = window.setTimeout(() => {
        setMarkerPhase('idle')
      }, textCloseDelayMs)

      return 'closing'
    })
  }

  const updateCenterHitState = () => {
    const viewport = viewportRef.current
    if (!viewport || !hasPointerPositionRef.current) {
      setCenterHovering(false)
      return
    }

    const viewportRect = viewport.getBoundingClientRect()
    const isPointerInsideViewport =
      pointerXRef.current >= viewportRect.left &&
      pointerXRef.current <= viewportRect.right &&
      pointerYRef.current >= viewportRect.top &&
      pointerYRef.current <= viewportRect.bottom

    pointerInsideRef.current = isPointerInsideViewport
    if (!isPointerInsideViewport) {
      setCenterHovering(false)
      return
    }

    const centerX = viewportRect.left + viewportRect.width / 2
    const centerY = viewportRect.top + viewportRect.height / 2

    const centeredCard = document
      .elementFromPoint(centerX, centerY)
      ?.closest('.gallery-card') as HTMLElement | null

    if (!centeredCard) {
      setCenterHovering(false)
      return
    }

    const centeredRect = centeredCard.getBoundingClientRect()
    const isPointerInsideCenteredCard =
      pointerXRef.current >= centeredRect.left &&
      pointerXRef.current <= centeredRect.right &&
      pointerYRef.current >= centeredRect.top &&
      pointerYRef.current <= centeredRect.bottom

    setCenterHovering(isPointerInsideCenteredCard)
  }

  const requestCenterHitState = () => {
    if (centerHitRafRef.current !== null) {
      return
    }

    centerHitRafRef.current = window.requestAnimationFrame(() => {
      centerHitRafRef.current = null

      const now = performance.now()
      if (now - lastCenterHitTestAtRef.current < centerHitTestMinIntervalMs) {
        return
      }

      lastCenterHitTestAtRef.current = now
      updateCenterHitState()
    })
  }

  const runAnimation = () => {
    const distance = targetXRef.current - currentXRef.current

    if (Math.abs(distance) <= 0.15) {
      currentXRef.current = targetXRef.current
      isFocusCenterAnimationRef.current = false
      normalizeInfinitePosition()
      applyTrackTransform()
      updateCardParallax()
      updateCenterHitState()
      animationFrameRef.current = null
      return
    }

    const inertialLerp = isFocusCenterAnimationRef.current
      ? focusCenterInertialLerp
      : GALLERY_SCROLL_INERTIAL_LERP
    currentXRef.current += distance * inertialLerp
    normalizeInfinitePosition()
    applyTrackTransform()
    updateCardParallax()

    if (pointerInsideRef.current) {
      requestCenterHitState()
    }

    animationFrameRef.current = window.requestAnimationFrame(runAnimation)
  }

  const startAnimation = () => {
    if (animationFrameRef.current !== null) {
      return
    }

    animationFrameRef.current = window.requestAnimationFrame(runAnimation)
  }

  const focusCardToCenter = (cardElement: HTMLElement) => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    const nextTargetX = cardElement.offsetLeft + cardElement.offsetWidth / 2 - viewport.clientWidth / 2
    isFocusCenterAnimationRef.current = true
    targetXRef.current = nextTargetX
    startAnimation()
  }

  const isCardPreciselyCentered = (cardElement: HTMLElement) => {
    const viewport = viewportRef.current
    if (!viewport) {
      return false
    }

    const viewportRect = viewport.getBoundingClientRect()
    const cardRect = cardElement.getBoundingClientRect()
    const viewportCenterX = viewportRect.left + viewportRect.width / 2
    const cardCenterX = cardRect.left + cardRect.width / 2
    const centerDelta = Math.abs(cardCenterX - viewportCenterX)

    return centerDelta <= centerNavigationThresholdPx
  }

  useEffect(() => {
    const firstSet = firstSetRef.current
    if (!firstSet) {
      return
    }

    const recalculateTrack = () => {
      setWidthRef.current = firstSet.scrollWidth
      if (setWidthRef.current === 0) {
        return
      }

      viewportWidthRef.current = viewportRef.current?.clientWidth ?? window.innerWidth

      cardMetricsRef.current = Array.from(
        (trackRef.current ?? firstSet).querySelectorAll<HTMLElement>('.gallery-card'),
      )
        .map((element) => {
          const mediaElement = element.querySelector<HTMLImageElement>('.gallery-card__image')
          if (!mediaElement) {
            return null
          }

          return {
            mediaElement,
            center: element.offsetLeft + element.offsetWidth / 2,
            halfWidth: element.offsetWidth / 2,
            lastShift: Number.NaN,
          }
        })
        .filter((metric): metric is CardMetric => metric !== null)

      const middleStart = setWidthRef.current * middleSetIndex
      const startingX = persistedGalleryTrackX ?? middleStart
      currentXRef.current = startingX
      targetXRef.current = startingX
      normalizeInfinitePosition()
      applyTrackTransform()
      updateCardParallax()
      requestCenterHitState()
    }

    recalculateTrack()
    const resizeObserver = new ResizeObserver(recalculateTrack)
    resizeObserver.observe(firstSet)
    window.addEventListener('resize', recalculateTrack)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', recalculateTrack)

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }

      if (centerHitRafRef.current !== null) {
        window.cancelAnimationFrame(centerHitRafRef.current)
      }

      if (closeTextTimeoutRef.current !== null) {
        window.clearTimeout(closeTextTimeoutRef.current)
      }

    }
    // requestCenterHitState depends on mutable refs and should not trigger effect recreation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallerySlides.length])

  useEffect(() => {
    // Eager preload so images are already in cache before the section enters view.
    const preloadedImages = uniqueImageSources.map((source) => {
      const image = new Image()
      image.src = source
      return image
    })

    return () => {
      preloadedImages.forEach((image) => {
        image.src = ''
      })
    }
  }, [uniqueImageSources])

  useEffect(() => {
    const onWindowPointerMove = (event: PointerEvent) => {
      hasPointerPositionRef.current = true
      pointerXRef.current = event.clientX
      pointerYRef.current = event.clientY
      requestCenterHitState()
    }

    window.addEventListener('pointermove', onWindowPointerMove, { passive: true })
    return () => window.removeEventListener('pointermove', onWindowPointerMove)
    // requestCenterHitState depends on mutable refs and should not trigger effect recreation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (setWidthRef.current === 0) {
      return
    }

    const viewportWidth = viewportRef.current?.clientWidth ?? window.innerWidth
    const normalizedDeltaX = normalizeWheelDeltaToPixels(event.deltaX, event.deltaMode, viewportWidth)
    const normalizedDeltaY = normalizeWheelDeltaToPixels(event.deltaY, event.deltaMode, viewportWidth)
    const isHorizontalIntent =
      Math.abs(normalizedDeltaX) > Math.abs(normalizedDeltaY) * 1.1 || event.shiftKey
    if (!isHorizontalIntent) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    isFocusCenterAnimationRef.current = false

    const dominantDelta =
      Math.abs(normalizedDeltaX) >= Math.abs(normalizedDeltaY) ? normalizedDeltaX : normalizedDeltaY

    const clampedDelta = Math.max(
      -GALLERY_SCROLL_MAX_WHEEL_DELTA,
      Math.min(GALLERY_SCROLL_MAX_WHEEL_DELTA, dominantDelta),
    )

    targetXRef.current += clampedDelta * GALLERY_SCROLL_WHEEL_DRAG_FACTOR
    startAnimation()
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!supportsGalleryPointerInteraction(event)) {
      return
    }

    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    activePointerIdRef.current = event.pointerId
    isDraggingRef.current = true
    setIsDragging(true)
    pointerInsideRef.current = true
    pointerXRef.current = event.clientX
    pointerYRef.current = event.clientY
    dragStartClientXRef.current = event.clientX
    dragStartTrackXRef.current = targetXRef.current
    dragLastClientXRef.current = event.clientX
    dragLastTimeRef.current = performance.now()
    dragVelocityRef.current = 0
    dragMovedRef.current = false
    isFocusCenterAnimationRef.current = false

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    viewport.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    hasPointerPositionRef.current = true
    pointerInsideRef.current = true
    pointerXRef.current = event.clientX
    pointerYRef.current = event.clientY

    if (isDraggingRef.current && activePointerIdRef.current === event.pointerId) {
      const now = performance.now()
      const elapsedMs = Math.max(1, now - dragLastTimeRef.current)
      const pointerDeltaX = event.clientX - dragLastClientXRef.current
      const instantaneousTrackVelocity = -pointerDeltaX / elapsedMs

      dragVelocityRef.current +=
        (instantaneousTrackVelocity - dragVelocityRef.current) * dragVelocitySmoothing
      dragLastClientXRef.current = event.clientX
      dragLastTimeRef.current = now

      const dragDeltaX = event.clientX - dragStartClientXRef.current
      if (Math.abs(dragDeltaX) >= dragClickThresholdPx) {
        dragMovedRef.current = true
      }
      const nextX = dragStartTrackXRef.current - dragDeltaX

      currentXRef.current = nextX
      targetXRef.current = nextX
      normalizeInfinitePosition()
      applyTrackTransform()
      updateCardParallax()
      requestCenterHitState()
      event.preventDefault()
      return
    }

    requestCenterHitState()
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return
    }

    const viewport = viewportRef.current
    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId)
    }

    activePointerIdRef.current = null
    isDraggingRef.current = false
    setIsDragging(false)
    const releaseVelocity = dragVelocityRef.current
    dragVelocityRef.current = 0

    if (dragMovedRef.current && Math.abs(releaseVelocity) >= dragReleaseMinVelocity) {
      const cappedReleaseVelocity = Math.max(
        -dragReleaseVelocityCap,
        Math.min(dragReleaseVelocityCap, releaseVelocity),
      )
      const momentumDistance = Math.max(
        -dragReleaseMaxDistancePx,
        Math.min(dragReleaseMaxDistancePx, cappedReleaseVelocity * dragReleaseMomentumMs),
      )

      isFocusCenterAnimationRef.current = false
      targetXRef.current = currentXRef.current + momentumDistance
      startAnimation()
    }

    if (!dragMovedRef.current) {
      const releasedCard = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('.gallery-card') as HTMLElement | null

      if (releasedCard) {
        const isReleasedCardCentered = isCardPreciselyCentered(releasedCard)

        if (isReleasedCardCentered) {
          const projectSlug = releasedCard.dataset.projectSlug
          if (projectSlug) {
            if (animationFrameRef.current !== null) {
              window.cancelAnimationFrame(animationFrameRef.current)
              animationFrameRef.current = null
            }
            targetXRef.current = currentXRef.current
            isFocusCenterAnimationRef.current = false
            navigate(`/work/${projectSlug}`)
            return
          }
        } else {
          focusCardToCenter(releasedCard)
        }
      }
    }

    requestCenterHitState()
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return
    }

    activePointerIdRef.current = null
    isDraggingRef.current = false
    setIsDragging(false)
    dragVelocityRef.current = 0
    dragMovedRef.current = false
    setCenterHovering(false)
  }

  const handlePointerLeave = () => {
    if (isDraggingRef.current) {
      return
    }

    pointerInsideRef.current = false
    if (centerHitRafRef.current !== null) {
      window.cancelAnimationFrame(centerHitRafRef.current)
      centerHitRafRef.current = null
    }
    setCenterHovering(false)
  }

  const handlePointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    hasPointerPositionRef.current = true
    pointerInsideRef.current = true
    pointerXRef.current = event.clientX
    pointerYRef.current = event.clientY
    requestCenterHitState()
  }

  return (
    <section className="index-section section--gallery">
      <p className="gallery-title">[THE GALLERY]</p>

      <div
        className={`gallery-slider-viewport ${isCenterHovering ? 'is-active-card' : ''} ${
          isDragging ? 'is-dragging' : ''
        }`}
        ref={viewportRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        data-gallery-scroll
      >
        <div className="gallery-slider-track" ref={trackRef}>
          {Array.from({ length: repeatedSetCount }, (_, setIndex) => (
            <div
              className="gallery-slider__set"
              key={`gallery-set-${setIndex}`}
              ref={setIndex === 0 ? firstSetRef : undefined}
              aria-hidden={setIndex !== middleSetIndex}
            >
              {gallerySlides.map((slide, index) => (
                <article
                  key={`${setIndex}-${slide.id}-${index}`}
                  className={`gallery-card gallery-card--${slide.orientation}`}
                  data-project-slug={slide.slug}
                >
                  <ResponsiveImage
                    image={slide.image}
                    loading="eager"
                    decoding="auto"
                    draggable={false}
                    className="gallery-card__image"
                  />
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={`gallery-center-action gallery-center-action--${markerPhase}`} aria-hidden="true">
        <span className="gallery-center-action__cluster">
          <span className="gallery-center-action__outer" />
          <span className="gallery-center-action__inner" />
        </span>
        <span className="gallery-center-action__text-wrap">
          <span className="gallery-center-action__text">OPEN PROJECT</span>
        </span>
      </div>

      <p className={`gallery-drag-hint ${isDragging ? 'is-hidden' : ''}`} aria-hidden="true">
        <span className="gallery-drag-hint__chevron">‹</span>
        <span className="gallery-drag-hint__text">DRAG/CLICK/SCROLL TO NAVIGATE</span>
        <span className="gallery-drag-hint__chevron">›</span>
      </p>

    </section>
  )
}

export default GallerySection
