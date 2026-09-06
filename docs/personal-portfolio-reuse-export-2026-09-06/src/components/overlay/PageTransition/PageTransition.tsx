import gsap from 'gsap'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useLocation, type Location } from 'react-router-dom'
import { ensurePageMotionEase, PAGE_MOTION_EASE_NAME } from '../shared/pageMotionEase'
import { shouldUsePageTransitionPerformanceFallback } from '../../../utils/browser'
import './PageTransition.css'

const PAGE_INCOMING_DELAY_MS = 0
const PAGE_INCOMING_BASE_DURATION_MS = 1290
const PAGE_INCOMING_SETTLE_EXTRA_MS = 266
const PAGE_INCOMING_DURATION_MS = PAGE_INCOMING_BASE_DURATION_MS + PAGE_INCOMING_SETTLE_EXTRA_MS
const REDUCED_MOTION_INCOMING_DURATION_MS = 360
const PAGE_INCOMING_DELAY_S = PAGE_INCOMING_DELAY_MS / 1000
const PAGE_INCOMING_DURATION_S = PAGE_INCOMING_DURATION_MS / 1000
const REDUCED_MOTION_INCOMING_DURATION_S = REDUCED_MOTION_INCOMING_DURATION_MS / 1000

const DEBUG_PAGE_TRANSITION = import.meta.env.DEV
const DEBUG_UPDATE_LOG_INTERVAL_MS = 120
const SLOW_FRAME_THRESHOLD_MS = 22
const PAGE_EASE_NAME = PAGE_MOTION_EASE_NAME
const OUTGOING_MIN_SCALE = 0.88
const OUTGOING_DIM_BASE_OPACITY = 0.08
const OUTGOING_DIM_PROGRESS_OPACITY = 0.48
const OUTGOING_DIM_MAX_OPACITY = OUTGOING_DIM_BASE_OPACITY + OUTGOING_DIM_PROGRESS_OPACITY
const TEXT_REVEAL_SELECTOR =
  'h1, h2, h3, h4, h5, h6, p, li, a, button, label, dt, dd, figcaption, blockquote'
const TEXT_REVEAL_MEDIA_SELECTOR = 'img, picture, video, canvas, svg, iframe'
const TEXT_REVEAL_EXCLUDE_SELECTOR =
  '[data-text-reveal-exclude], .project-edge-hint, .project-edge-hint__fill, .project-edge-line, .work-project-action, .work-project-action__text-wrap, .work-project-action__text'
const TEXT_REVEAL_TRIGGER_PROGRESS = 0.7
const TEXT_REVEAL_BLUR_PX = 6
const TEXT_REVEAL_OFFSET_Y = 6
const TEXT_REVEAL_DURATION_S = 1.05
const TEXT_REVEAL_STAGGER_S = 0.052
const TEXT_REVEAL_HANDOFF_DURATION_MULTIPLIER = 1.45
const TEXT_REVEAL_HANDOFF_MIN_REMAINING = 0.4
const TEXT_REVEAL_HANDOFF_MIN_DURATION_S = 0.28
const TEXT_REVEAL_MAX_TARGETS = 32
const TEXT_REVEAL_MAX_ANIMATED_NODES = 96
const PERFORMANCE_FALLBACK_TEXT_REVEAL_MAX_TARGETS = 18
const PERFORMANCE_FALLBACK_TEXT_REVEAL_MAX_ANIMATED_NODES = 54
const PERFORMANCE_FALLBACK_TEXT_REVEAL_OFFSET_Y = 4
const TEXT_REVEAL_LINE_TOP_TOLERANCE_PX = 3
const TEXT_REVEAL_START_DELAY_S = 0.02

type TextRevealOptions = {
  blurPx: number
  maxAnimatedNodes: number
  maxTargets: number
  offsetY: number
  splitIntoLines: boolean
}

type TextRevealSnapshot = {
  blur: number
  opacity: number
  y: number
}

function splitElementIntoLineTargets(element: HTMLElement): HTMLElement[] | null {
  if (element.childElementCount > 0) {
    return null
  }

  const sourceText = element.textContent
  if (!sourceText || sourceText.trim().length === 0) {
    return null
  }

  const words = sourceText.match(/\S+/g)
  if (!words || words.length === 0) {
    return null
  }

  element.textContent = ''
  const measureWordSpans: HTMLSpanElement[] = words.map((word) => {
    const span = document.createElement('span')
    span.className = 'page-transition__reveal-token'
    span.textContent = word
    element.appendChild(span)
    return span
  })

  // Keep native spacing behavior during measurement.
  measureWordSpans.forEach((_, index) => {
    if (index >= measureWordSpans.length - 1) {
      return
    }
    element.insertBefore(document.createTextNode(' '), measureWordSpans[index + 1])
  })

  const wordLineIndices: number[] = []
  let currentLineTop: number | null = null
  let currentLineIndex = -1
  measureWordSpans.forEach((wordSpan) => {
    const top = wordSpan.getBoundingClientRect().top
    if (currentLineTop === null || Math.abs(top - currentLineTop) > TEXT_REVEAL_LINE_TOP_TOLERANCE_PX) {
      currentLineIndex += 1
      currentLineTop = top
    }
    wordLineIndices.push(currentLineIndex)
  })

  element.textContent = ''
  const lineTargets: HTMLSpanElement[] = []
  let activeLine: HTMLSpanElement | null = null
  let activeLineWordCount = 0
  words.forEach((word, index) => {
    const lineIndex = wordLineIndices[index]
    if (!activeLine || lineTargets.length - 1 !== lineIndex) {
      activeLine = document.createElement('span')
      activeLine.className = 'page-transition__reveal-line'
      lineTargets.push(activeLine)
      element.appendChild(activeLine)
      activeLineWordCount = 0
    }
    if (activeLineWordCount > 0) {
      activeLine.appendChild(document.createTextNode(' '))
    }
    const tokenSpan = document.createElement('span')
    tokenSpan.className = 'page-transition__reveal-token'
    tokenSpan.textContent = word
    activeLine.appendChild(tokenSpan)
    activeLineWordCount += 1
  })

  return lineTargets.length > 0 ? lineTargets : null
}

function parseBlurPx(filterValue: string): number {
  const match = /blur\(([-\d.]+)px\)/.exec(filterValue)
  if (!match) {
    return 0
  }
  const parsed = Number.parseFloat(match[1] ?? '0')
  return Number.isFinite(parsed) ? parsed : 0
}

function remapSnapshotsByRelativeIndex(
  snapshots: TextRevealSnapshot[],
  targetCount: number,
): TextRevealSnapshot[] {
  if (targetCount <= 0 || snapshots.length === 0) {
    return []
  }
  if (snapshots.length === targetCount) {
    return snapshots
  }
  if (snapshots.length === 1) {
    return Array.from({ length: targetCount }, () => snapshots[0])
  }

  const sourceLastIndex = snapshots.length - 1
  const targetLastIndex = Math.max(1, targetCount - 1)

  return Array.from({ length: targetCount }, (_, targetIndex) => {
    const normalized = targetIndex / targetLastIndex
    const sourcePosition = normalized * sourceLastIndex
    const sourceLowerIndex = Math.floor(sourcePosition)
    const sourceUpperIndex = Math.min(sourceLastIndex, sourceLowerIndex + 1)
    const weight = sourcePosition - sourceLowerIndex
    const lower = snapshots[sourceLowerIndex]
    const upper = snapshots[sourceUpperIndex]

    return {
      opacity: lower.opacity + (upper.opacity - lower.opacity) * weight,
      y: lower.y + (upper.y - lower.y) * weight,
      blur: lower.blur + (upper.blur - lower.blur) * weight,
    }
  })
}

function collectRevealTargets(root: HTMLElement, options: TextRevealOptions) {
  const { maxAnimatedNodes, maxTargets, splitIntoLines } = options
  const rawTextTargets = Array.from(root.querySelectorAll<HTMLElement>(TEXT_REVEAL_SELECTOR))
  const textTargetEntries = rawTextTargets
    .filter((element) => {
      if (element.getAttribute('aria-hidden') === 'true') {
        return false
      }
      if (element.hasAttribute('hidden')) {
        return false
      }
      if (element.matches(TEXT_REVEAL_EXCLUDE_SELECTOR) || element.closest(TEXT_REVEAL_EXCLUDE_SELECTOR)) {
        return false
      }
      const computedStyle = window.getComputedStyle(element)
      if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
        return false
      }
      if (element.matches(TEXT_REVEAL_MEDIA_SELECTOR)) {
        return false
      }
      if (element.querySelector(TEXT_REVEAL_MEDIA_SELECTOR)) {
        return false
      }
      if ((element.textContent ?? '').trim().length === 0) {
        return false
      }
      const hasNestedRevealTarget = Array.from(element.children).some((child) =>
        child.matches(TEXT_REVEAL_SELECTOR),
      )
      return !hasNestedRevealTarget
    })
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 0 && rect.height > 0)
    .sort((first, second) => first.rect.top - second.rect.top)
  const textTargets = textTargetEntries.slice(0, maxTargets).map(({ element }) => element)

  const lineRevealTargets: HTMLElement[] = []
  const fallbackTargets: HTMLElement[] = []
  textTargets.forEach((target) => {
    if (!splitIntoLines) {
      fallbackTargets.push(target)
      return
    }

    const lineTargets = splitElementIntoLineTargets(target)
    if (!lineTargets || lineTargets.length === 0) {
      fallbackTargets.push(target)
      return
    }
    lineRevealTargets.push(...lineTargets)
  })

  const animatedTargets = [...lineRevealTargets, ...fallbackTargets]
    .map((target) => ({ target, top: target.getBoundingClientRect().top }))
    .sort((first, second) => first.top - second.top)
    .slice(0, maxAnimatedNodes)
    .map(({ target }) => target)

  return { animatedTargets }
}

ensurePageMotionEase()

type TransitionWindow = Window & {
  __projectOutgoingDimOpacity?: number
}

type PageTransitionProps = {
  renderRoute: (location: Location) => ReactNode
  onTransitioningChange?: (isTransitioning: boolean) => void
  onDisplayedLocationKeyChange?: (key: string) => void
}

type PageTransitionOutgoingLayerStyle = CSSProperties & {
  '--page-transition-outgoing-scroll-y': string
}

function PageTransition({
  renderRoute,
  onTransitioningChange,
  onDisplayedLocationKeyChange,
}: PageTransitionProps) {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [incomingLocation, setIncomingLocation] = useState<Location | null>(null)
  const [outgoingSnapshotMarkup, setOutgoingSnapshotMarkup] = useState<string | null>(null)
  const [outgoingScrollY, setOutgoingScrollY] = useState(0)
  const [outgoingDimOpacity, setOutgoingDimOpacity] = useState(0)
  const [useSnapshotDimOnly, setUseSnapshotDimOnly] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPerformanceFallback] = useState(() => shouldUsePageTransitionPerformanceFallback())
  const currentContentRef = useRef<HTMLDivElement | null>(null)
  const incomingMotionRef = useRef<HTMLDivElement | null>(null)
  const outgoingMotionRef = useRef<HTMLDivElement | null>(null)
  const outgoingDimRef = useRef<HTMLDivElement | null>(null)
  const incomingTweenRef = useRef<gsap.core.Tween | null>(null)
  const displayLocationRef = useRef(location)
  const incomingLocationRef = useRef<Location | null>(null)
  const isTransitioningRef = useRef(false)
  const pendingLocationRef = useRef<Location | null>(null)
  const activeTransitionTargetKeyRef = useRef<string | null>(null)
  const incomingTweenRunIdRef = useRef(0)
  const hasInitializedRevealRef = useRef(false)
  const textRevealHandoffRef = useRef<{ key: string; snapshots: TextRevealSnapshot[] } | null>(null)

  const getTextRevealOptions = useCallback(
    (prefersReducedMotion: boolean): TextRevealOptions => {
      const shouldUseReducedFallback = prefersReducedMotion || isPerformanceFallback
      return {
        blurPx: shouldUseReducedFallback ? 0 : TEXT_REVEAL_BLUR_PX,
        maxAnimatedNodes: isPerformanceFallback
          ? PERFORMANCE_FALLBACK_TEXT_REVEAL_MAX_ANIMATED_NODES
          : TEXT_REVEAL_MAX_ANIMATED_NODES,
        maxTargets: isPerformanceFallback ? PERFORMANCE_FALLBACK_TEXT_REVEAL_MAX_TARGETS : TEXT_REVEAL_MAX_TARGETS,
        offsetY: shouldUseReducedFallback ? PERFORMANCE_FALLBACK_TEXT_REVEAL_OFFSET_Y : TEXT_REVEAL_OFFSET_Y,
        splitIntoLines: !isPerformanceFallback,
      }
    },
    [isPerformanceFallback],
  )

  useEffect(() => {
    incomingLocationRef.current = incomingLocation
  }, [incomingLocation])

  useEffect(() => {
    isTransitioningRef.current = isTransitioning
  }, [isTransitioning])

  useEffect(() => {
    onTransitioningChange?.(isTransitioning)
  }, [isTransitioning, onTransitioningChange])

  useEffect(() => {
    onDisplayedLocationKeyChange?.(displayLocation.key)
  }, [displayLocation.key, onDisplayedLocationKeyChange])

  useEffect(() => {
    displayLocationRef.current = displayLocation
  }, [displayLocation])

  const startTransition = useCallback(
    (nextLocation: Location) => {
      const currentDisplayLocation = displayLocationRef.current
      if (nextLocation.key === currentDisplayLocation.key) {
        return
      }

      if (isTransitioningRef.current) {
        pendingLocationRef.current = nextLocation
        if (DEBUG_PAGE_TRANSITION) {
          console.debug('[PageTransition] queued during active transition', { key: nextLocation.key })
        }
        return
      }

      if (activeTransitionTargetKeyRef.current === nextLocation.key) {
        return
      }

      const transitionWindow = window as TransitionWindow
      const pendingDimOpacity = transitionWindow.__projectOutgoingDimOpacity
      if (typeof pendingDimOpacity === 'number' && Number.isFinite(pendingDimOpacity)) {
        setOutgoingDimOpacity(Math.max(0, Math.min(1, pendingDimOpacity)))
        setUseSnapshotDimOnly(true)
      } else {
        setOutgoingDimOpacity(0)
        setUseSnapshotDimOnly(false)
      }
      delete transitionWindow.__projectOutgoingDimOpacity
      // Snapshot outgoing markup once at transition start so the outgoing layer stays static.
      const snapshotMarkup = currentContentRef.current?.innerHTML ?? null
      const currentScrollY = window.scrollY
      setOutgoingSnapshotMarkup(snapshotMarkup)

      isTransitioningRef.current = true
      activeTransitionTargetKeyRef.current = nextLocation.key
      setOutgoingScrollY(currentScrollY)
      // Normalize scroll immediately so incoming live render and final handoff both resolve at top.
      if (currentScrollY > 0) {
        window.scrollTo(0, 0)
      }
      setIncomingLocation(nextLocation)
      setIsTransitioning(true)
    },
    [],
  )

  const finishTransition = useCallback(
    (completedIncomingKey: string) => {
      if (!isTransitioningRef.current) {
        return
      }

      const activeIncoming = incomingLocationRef.current
      if (!activeIncoming || activeIncoming.key !== completedIncomingKey) {
        return
      }

      const completedLocation = activeIncoming
      isTransitioningRef.current = false
      activeTransitionTargetKeyRef.current = null
      setDisplayLocation(completedLocation)
      setIncomingLocation(null)
      setOutgoingSnapshotMarkup(null)
      setOutgoingDimOpacity(0)
      setUseSnapshotDimOnly(false)
      setIsTransitioning(false)

      const queued = pendingLocationRef.current
      pendingLocationRef.current = null
      if (queued && queued.key !== completedLocation.key) {
        window.requestAnimationFrame(() => {
          startTransition(queued)
        })
      }
    },
    [startTransition],
  )

  useEffect(() => {
    if (location.key === displayLocation.key) {
      return
    }

    if (isTransitioningRef.current) {
      pendingLocationRef.current = location
      return
    }

    startTransition(location)
  }, [displayLocation.key, location, startTransition])

  useLayoutEffect(() => {
    if (!isTransitioning || !incomingLocation) {
      return
    }

    const incomingElement = incomingMotionRef.current
    if (!incomingElement) {
      return
    }
    const outgoingElement = outgoingMotionRef.current
    const outgoingDimElement = outgoingDimRef.current
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const revealOptions = getTextRevealOptions(prefersReducedMotion)
    const useForce3D = false

    const duration = prefersReducedMotion
      ? REDUCED_MOTION_INCOMING_DURATION_S
      : PAGE_INCOMING_DURATION_S
    const ease = prefersReducedMotion ? 'power1.out' : PAGE_EASE_NAME
    const startContentOpacity = prefersReducedMotion ? 1 : 0
    const startOutgoingDimOpacity = Math.max(0, Math.min(OUTGOING_DIM_MAX_OPACITY, outgoingDimOpacity))
    const shouldAnimateOutgoingDim = !useSnapshotDimOnly && startOutgoingDimOpacity <= 0.0001
    const targetLocationKey = incomingLocation.key
    const runId = incomingTweenRunIdRef.current + 1
    incomingTweenRunIdRef.current = runId
    let textRevealTween: gsap.core.Tween | null = null

    const ctx = gsap.context(() => {
      if (incomingTweenRef.current?.isActive() && activeTransitionTargetKeyRef.current === targetLocationKey) {
        if (DEBUG_PAGE_TRANSITION) {
          console.debug('[PageTransition] duplicate tween request ignored', {
            key: targetLocationKey,
            runId,
          })
        }
        return
      }

      if (incomingTweenRef.current) {
        if (DEBUG_PAGE_TRANSITION) {
          console.warn('[PageTransition] replacing active tween', {
            key: targetLocationKey,
            runId,
          })
        }
        incomingTweenRef.current.kill()
        incomingTweenRef.current = null
      }

      gsap.killTweensOf(incomingElement)

      // Use viewport-based pixel offset, not yPercent, so long pages don't push creep off-screen.
      const incomingStartY = window.innerHeight
      gsap.set(incomingElement, {
        y: incomingStartY,
        opacity: 1,
        '--incoming-content-opacity': startContentOpacity,
        force3D: useForce3D,
        willChange: 'transform, opacity',
      })
      if (outgoingElement) {
        gsap.set(outgoingElement, {
          scale: 1,
          opacity: 1,
          force3D: useForce3D,
          willChange: 'transform',
          transformOrigin: 'center center',
        })
      }
      if (outgoingDimElement) {
        gsap.set(outgoingDimElement, {
          opacity: startOutgoingDimOpacity,
          willChange: 'opacity',
        })
      }

      let lastUpdateLogAt = 0
      let lastFrameAt = performance.now()
      let maxFrameDelta = 0
      let slowFrameCount = 0
      let outgoingTween: gsap.core.Tween | null = null
      let hasTriggeredTextReveal = false
      const revealPlan = collectRevealTargets(incomingElement, revealOptions)
      const revealTargets = revealPlan.animatedTargets
      const revealClearProps =
        revealOptions.blurPx > 0 ? 'opacity,filter,transform,willChange' : 'opacity,transform,willChange'

      if (revealTargets.length > 0) {
        if (revealOptions.blurPx > 0) {
          gsap.set(revealTargets, {
            opacity: prefersReducedMotion ? 0 : 0.16,
            y: prefersReducedMotion ? 0 : revealOptions.offsetY,
            filter: `blur(${revealOptions.blurPx}px)`,
            willChange: 'opacity,filter,transform',
          })
        } else {
          gsap.set(revealTargets, {
            opacity: prefersReducedMotion ? 0 : 0.16,
            y: prefersReducedMotion ? 0 : revealOptions.offsetY,
            willChange: 'opacity,transform',
          })
        }
      }

      const startTextReveal = () => {
        if (hasTriggeredTextReveal || revealTargets.length === 0) {
          return
        }
        hasTriggeredTextReveal = true

        if (revealOptions.blurPx > 0) {
          textRevealTween = gsap.to(revealTargets, {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: prefersReducedMotion ? 0.2 : TEXT_REVEAL_DURATION_S,
            delay: prefersReducedMotion ? 0 : TEXT_REVEAL_START_DELAY_S,
            ease: prefersReducedMotion ? 'power1.out' : 'power2.out',
            stagger: prefersReducedMotion ? 0 : TEXT_REVEAL_STAGGER_S,
            onComplete: () => {
              gsap.set(revealTargets, { clearProps: revealClearProps })
            },
          })
          return
        }

        textRevealTween = gsap.to(revealTargets, {
          opacity: 1,
          y: 0,
          duration: prefersReducedMotion ? 0.2 : TEXT_REVEAL_DURATION_S,
          delay: prefersReducedMotion ? 0 : TEXT_REVEAL_START_DELAY_S,
          ease: prefersReducedMotion ? 'power1.out' : 'power2.out',
          stagger: prefersReducedMotion ? 0 : TEXT_REVEAL_STAGGER_S,
          onComplete: () => {
            gsap.set(revealTargets, { clearProps: revealClearProps })
          },
        })
      }

      const setOutgoingDimOpacityValue = !useSnapshotDimOnly && outgoingDimElement
        ? gsap.quickSetter(outgoingDimElement, 'opacity')
        : null
      if (outgoingElement) {
        gsap.killTweensOf(outgoingElement)
        outgoingTween = gsap.to(outgoingElement, {
          scale: OUTGOING_MIN_SCALE,
          duration,
          delay: PAGE_INCOMING_DELAY_S,
          ease,
          force3D: useForce3D,
        })

      }

      const tween = gsap.to(incomingElement, {
        y: 0,
        '--incoming-content-opacity': 1,
        duration,
        delay: PAGE_INCOMING_DELAY_S,
        ease,
        force3D: useForce3D,
        onStart: () => {
          if (!DEBUG_PAGE_TRANSITION) {
            return
          }
          console.debug('[PageTransition] tween start', {
            key: targetLocationKey,
            runId,
            transform: incomingElement.style.transform,
            contentOpacity: incomingElement.style.getPropertyValue('--incoming-content-opacity'),
          })
        },
        onUpdate: () => {
          const now = performance.now()
          const frameDelta = now - lastFrameAt
          lastFrameAt = now
          if (frameDelta > maxFrameDelta) {
            maxFrameDelta = frameDelta
          }
          if (frameDelta > SLOW_FRAME_THRESHOLD_MS) {
            slowFrameCount += 1
          }
          const progress = tween.progress()
          const outgoingProgress = outgoingTween ? outgoingTween.progress() : progress
          if (setOutgoingDimOpacityValue) {
            const nextDimOpacity = shouldAnimateOutgoingDim
              ? startOutgoingDimOpacity + (OUTGOING_DIM_MAX_OPACITY - startOutgoingDimOpacity) * outgoingProgress
              : startOutgoingDimOpacity
            setOutgoingDimOpacityValue(nextDimOpacity)
          }
          if (progress >= TEXT_REVEAL_TRIGGER_PROGRESS) {
            startTextReveal()
          }

          if (!DEBUG_PAGE_TRANSITION) {
            return
          }
          if (now - lastUpdateLogAt < DEBUG_UPDATE_LOG_INTERVAL_MS) {
            return
          }
          lastUpdateLogAt = now
          console.debug('[PageTransition] tween update', {
            key: targetLocationKey,
            runId,
            progress: Number(progress.toFixed(3)),
            outgoingProgress: Number(outgoingProgress.toFixed(3)),
            frameDelta: Number(frameDelta.toFixed(2)),
            transform: incomingElement.style.transform,
            contentOpacity: incomingElement.style.getPropertyValue('--incoming-content-opacity'),
          })
        },
        onComplete: () => {
          if (runId !== incomingTweenRunIdRef.current) {
            if (DEBUG_PAGE_TRANSITION) {
              console.debug('[PageTransition] stale completion ignored', {
                key: targetLocationKey,
                runId,
              })
            }
            return
          }

          if (DEBUG_PAGE_TRANSITION) {
            console.debug('[PageTransition] tween complete', {
              key: targetLocationKey,
              runId,
              maxFrameDelta: Number(maxFrameDelta.toFixed(2)),
              slowFrameCount,
              transform: incomingElement.style.transform,
              contentOpacity: incomingElement.style.getPropertyValue('--incoming-content-opacity'),
            })
          }
          startTextReveal()
          if (hasTriggeredTextReveal && revealTargets.length > 0) {
            const snapshots = revealTargets.map((target) => {
              const opacityValue = Number(gsap.getProperty(target, 'opacity'))
              const yValue = Number(gsap.getProperty(target, 'y'))
              return {
                blur:
                  revealOptions.blurPx > 0 ? parseBlurPx(window.getComputedStyle(target).filter) : 0,
                opacity: Number.isFinite(opacityValue) ? Math.max(0, Math.min(1, opacityValue)) : 1,
                y: Number.isFinite(yValue) ? yValue : 0,
              }
            })
            textRevealHandoffRef.current = { key: targetLocationKey, snapshots }
          } else {
            textRevealHandoffRef.current = null
          }

          gsap.set(incomingElement, { clearProps: 'transform,opacity,willChange' })
          incomingElement.style.removeProperty('--incoming-content-opacity')
          if (outgoingElement) {
            gsap.set(outgoingElement, { clearProps: 'transform,willChange' })
          }
          if (outgoingDimElement) {
            gsap.set(outgoingDimElement, { clearProps: 'opacity,willChange' })
          }
          if (outgoingTween) {
            outgoingTween.kill()
            outgoingTween = null
          }
          if (textRevealTween) {
            textRevealTween.kill()
            textRevealTween = null
          }
          if (incomingTweenRef.current === tween) {
            incomingTweenRef.current = null
          }
          finishTransition(targetLocationKey)
        },
      })

      incomingTweenRef.current = tween
    }, incomingElement)

    return () => {
      const currentTween = incomingTweenRef.current
      if (currentTween) {
        currentTween.kill()
        if (incomingTweenRef.current === currentTween) {
          incomingTweenRef.current = null
        }
      }
      if (outgoingElement) {
        gsap.killTweensOf(outgoingElement)
      }
      if (outgoingDimElement) {
        gsap.killTweensOf(outgoingDimElement)
      }
      if (textRevealTween) {
        textRevealTween.kill()
      }
      ctx.revert()
    }
  }, [
    finishTransition,
    getTextRevealOptions,
    incomingLocation,
    isTransitioning,
    isPerformanceFallback,
    outgoingDimOpacity,
    useSnapshotDimOnly,
  ])

  useLayoutEffect(() => {
    const currentElement = currentContentRef.current
    if (!currentElement || isTransitioning) {
      return
    }

    if (!hasInitializedRevealRef.current) {
      hasInitializedRevealRef.current = true
      return
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const revealOptions = getTextRevealOptions(prefersReducedMotion)
    const revealClearProps =
      revealOptions.blurPx > 0 ? 'opacity,filter,transform,willChange' : 'opacity,transform,willChange'

    const revealTargets = collectRevealTargets(currentElement, revealOptions).animatedTargets

    if (revealTargets.length === 0) {
      textRevealHandoffRef.current = null
      return
    }

    const handoff = textRevealHandoffRef.current
    const handoffSnapshots = handoff && handoff.key === displayLocation.key ? handoff.snapshots : null
    textRevealHandoffRef.current = null

    if (prefersReducedMotion || !handoffSnapshots || handoffSnapshots.length === 0) {
      gsap.set(revealTargets, { clearProps: revealClearProps })
      return
    }

    const remappedSnapshots = remapSnapshotsByRelativeIndex(handoffSnapshots, revealTargets.length)
    const baseOpacity = prefersReducedMotion ? 0 : 0.16
    const handoffProgress = Math.max(
      0,
      Math.min(
        1,
        remappedSnapshots.reduce((sum, snapshot) => {
          const normalized = (snapshot.opacity - baseOpacity) / Math.max(0.0001, 1 - baseOpacity)
          return sum + Math.max(0, Math.min(1, normalized))
        }, 0) / remappedSnapshots.length,
      ),
    )

    revealTargets.forEach((target, index) => {
      const snapshot = remappedSnapshots[index]
      if (revealOptions.blurPx > 0) {
        gsap.set(target, {
          opacity: snapshot.opacity,
          y: snapshot.y,
          filter: `blur(${Math.max(0, snapshot.blur)}px)`,
          willChange: 'opacity,filter,transform',
        })
      } else {
        gsap.set(target, {
          opacity: snapshot.opacity,
          y: snapshot.y,
          willChange: 'opacity,transform',
        })
      }
    })

    if (handoffProgress >= 0.9995) {
      gsap.set(revealTargets, { clearProps: revealClearProps })
      return
    }

    let revealTween: gsap.core.Tween | null = null
    let startRafId: number | null = window.requestAnimationFrame(() => {
      startRafId = null
      const remaining = 1 - handoffProgress
      if (revealOptions.blurPx > 0) {
        revealTween = gsap.to(revealTargets, {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: Math.max(
            TEXT_REVEAL_HANDOFF_MIN_DURATION_S,
            TEXT_REVEAL_DURATION_S *
              TEXT_REVEAL_HANDOFF_DURATION_MULTIPLIER *
              Math.max(TEXT_REVEAL_HANDOFF_MIN_REMAINING, remaining),
          ),
          delay: 0,
          ease: 'power2.out',
          stagger: 0,
          onComplete: () => {
            gsap.set(revealTargets, { clearProps: revealClearProps })
          },
        })
        return
      }

      revealTween = gsap.to(revealTargets, {
        opacity: 1,
        y: 0,
        duration: Math.max(
          TEXT_REVEAL_HANDOFF_MIN_DURATION_S,
          TEXT_REVEAL_DURATION_S *
            TEXT_REVEAL_HANDOFF_DURATION_MULTIPLIER *
            Math.max(TEXT_REVEAL_HANDOFF_MIN_REMAINING, remaining),
        ),
        delay: 0,
        ease: 'power2.out',
        stagger: 0,
        onComplete: () => {
          gsap.set(revealTargets, { clearProps: revealClearProps })
        },
      })
    })

    return () => {
      if (startRafId !== null) {
        window.cancelAnimationFrame(startRafId)
      }
      if (revealTween) {
        revealTween.kill()
      }
      gsap.set(revealTargets, { clearProps: revealClearProps })
    }
  }, [displayLocation.key, getTextRevealOptions, isTransitioning])

  return (
    <div
      className={`page-transition ${isTransitioning ? 'is-transitioning' : ''}${
        isPerformanceFallback ? ' is-performance-fallback' : ''
      }`}
    >
      <div ref={currentContentRef} className="page-transition__current">
        {renderRoute(displayLocation)}
      </div>

      {isTransitioning && outgoingSnapshotMarkup ? (
        <div
          className="page-transition__outgoing-layer"
          style={
            {
              '--page-transition-outgoing-scroll-y': `${outgoingScrollY}px`,
            } as PageTransitionOutgoingLayerStyle
          }
          aria-hidden="true"
        >
          <div ref={outgoingMotionRef} className="page-transition__outgoing-motion">
            <div
              className="page-transition__outgoing-scroll"
              style={{ transform: `translate3d(0, ${-outgoingScrollY}px, 0)` }}
            >
              <div className="page-transition__outgoing-content">
                <div
                  className="page-transition__outgoing-snapshot"
                  // Controlled snapshot from this app's own DOM.
                  dangerouslySetInnerHTML={{ __html: outgoingSnapshotMarkup }}
                />
                {!useSnapshotDimOnly ? (
                  <div
                    ref={outgoingDimRef}
                    className="page-transition__outgoing-dim"
                    style={{ opacity: outgoingDimOpacity.toFixed(3) }}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isTransitioning && incomingLocation ? (
        <div className="page-transition__incoming-layer" aria-hidden="true">
          <div ref={incomingMotionRef} className="page-transition__incoming-motion">
            <div className="page-transition__incoming-content">
              {renderRoute(incomingLocation)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default PageTransition
