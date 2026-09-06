import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation, type Location } from 'react-router-dom'
import Navbar from './components/layout/Navbar/Navbar'
import WipBanner from './components/layout/WipBanner/WipBanner'
import SmoothScroll from './components/navigation/SmoothScroll/SmoothScroll'
import CursorTrail from './components/overlay/CursorTrail/CursorTrail'
import InitialLoader from './components/overlay/InitialLoader/InitialLoader'
import PageTransition from './components/overlay/PageTransition/PageTransition'
import motionBlurHeroOptimized from './assets/images/motion-blur-hero-optimized.jpg'
import { useTheme } from './hooks/useTheme'
import FreetimePage from './pages/FreetimePage'
import IndexPage from './pages/IndexPage'
import InfoPage from './pages/InfoPage'
import LegalNoticePage from './pages/LegalNoticePage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import WorkPage from './pages/WorkPage'
import './App.css'

const SHOW_WIP_BANNER = false
const INTRO_SESSION_STORAGE_KEY = 'portfolio:intro-played'

function hasIntroPlayedThisSession() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return window.sessionStorage.getItem(INTRO_SESSION_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function markIntroPlayedThisSession() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(INTRO_SESSION_STORAGE_KEY, '1')
  } catch {
    // Ignore storage write failures (private mode / restricted environments).
  }
}

type AppRoutesProps = {
  routeLocation: Location
  isPageTransitioning: boolean
}

function AppRoutes({ routeLocation, isPageTransitioning }: AppRoutesProps) {
  return (
    <Routes location={routeLocation}>
      <Route path="/" element={<IndexPage />} />
      <Route path="/work" element={<WorkPage isPageTransitioning={isPageTransitioning} />} />
      <Route path="/work/:projectSlug" element={<ProjectDetailPage isPageTransitioning={isPageTransitioning} />} />
      <Route path="/freetime" element={<FreetimePage />} />
      <Route path="/info" element={<InfoPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/legal-notice" element={<LegalNoticePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  const location = useLocation()
  const [introPlayedInSession] = useState(() => hasIntroPlayedThisSession())
  const [displayedLocationKey, setDisplayedLocationKey] = useState(location.key)
  const [isPageTransitioning, setIsPageTransitioning] = useState(false)
  const [isRevealed, setIsRevealed] = useState(() => introPlayedInSession)
  const [isLoaderDone, setIsLoaderDone] = useState(() => introPlayedInSession)
  const { theme, toggleTheme } = useTheme()
  const handleReveal = useCallback(() => setIsRevealed(true), [])
  const handleLoaderComplete = useCallback(() => setIsLoaderDone(true), [])

  useEffect(() => {
    if (!introPlayedInSession) {
      markIntroPlayedThisSession()
    }
  }, [introPlayedInSession])

  useEffect(() => {
    const image = new Image()
    image.src = motionBlurHeroOptimized
    image.decoding = 'async'
    image.fetchPriority = 'high'
    void image.decode().catch(() => undefined)
  }, [])

  const shouldDeferRouteScrollSync = useMemo(
    () => isPageTransitioning || location.key !== displayedLocationKey,
    [displayedLocationKey, isPageTransitioning, location.key],
  )

  return (
    <div className={`app-shell ${isRevealed ? 'is-revealed' : ''}`}>
      {!isLoaderDone ? (
        <InitialLoader onReveal={handleReveal} onComplete={handleLoaderComplete} />
      ) : null}

      {isRevealed ? (
        <>
          <SmoothScroll deferRouteSync={shouldDeferRouteScrollSync} />
          <CursorTrail />
          {SHOW_WIP_BANNER ? <WipBanner /> : null}
          <Navbar theme={theme} onToggleTheme={toggleTheme} />
        </>
      ) : null}

      <PageTransition
        renderRoute={(routeLocation) => (
          <AppRoutes routeLocation={routeLocation} isPageTransitioning={isPageTransitioning} />
        )}
        onTransitioningChange={setIsPageTransitioning}
        onDisplayedLocationKeyChange={setDisplayedLocationKey}
      />
    </div>
  )
}

export default App
