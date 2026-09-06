import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isSafariBrowser,
  isWindowsChromiumBrowser,
  shouldUsePageTransitionPerformanceFallback,
} from '../../src/utils/browser'

const originalNavigator = globalThis.navigator

function setNavigatorStub(value: unknown) {
  vi.stubGlobal('navigator', value)
}

afterEach(() => {
  if (typeof originalNavigator === 'undefined') {
    Reflect.deleteProperty(globalThis, 'navigator')
  } else {
    vi.stubGlobal('navigator', originalNavigator)
  }
  vi.restoreAllMocks()
})

describe('isWindowsChromiumBrowser', () => {
  it('returns true for Chrome on Windows user agent', () => {
    setNavigatorStub({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      platform: 'Win32',
      userAgentData: {
        brands: [{ brand: 'Chromium' }],
        platform: 'Windows',
      },
    })

    expect(isWindowsChromiumBrowser()).toBe(true)
  })

  it('returns true for Edge on Windows', () => {
    setNavigatorStub({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
      platform: 'Win32',
      userAgentData: {
        brands: [{ brand: 'Chromium' }, { brand: 'Microsoft Edge' }],
        platform: 'Windows',
      },
    })

    expect(isWindowsChromiumBrowser()).toBe(true)
  })

  it('returns false for Chrome on macOS', () => {
    setNavigatorStub({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      platform: 'MacIntel',
      userAgentData: {
        brands: [{ brand: 'Chromium' }],
        platform: 'macOS',
      },
    })

    expect(isWindowsChromiumBrowser()).toBe(false)
  })
})

describe('isSafariBrowser', () => {
  it('returns true for Safari user agent', () => {
    setNavigatorStub({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
      platform: 'MacIntel',
      userAgentData: {
        brands: [],
        platform: 'macOS',
      },
    })

    expect(isSafariBrowser()).toBe(true)
  })

  it('returns false for Chromium user agent', () => {
    setNavigatorStub({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      platform: 'Win32',
      userAgentData: {
        brands: [{ brand: 'Chromium' }],
        platform: 'Windows',
      },
    })

    expect(isSafariBrowser()).toBe(false)
  })
})

describe('shouldUsePageTransitionPerformanceFallback', () => {
  it('keeps fallback disabled for Windows Chromium browsers', () => {
    setNavigatorStub({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      platform: 'Win32',
      userAgentData: {
        brands: [{ brand: 'Chromium' }],
        platform: 'Windows',
      },
    })

    expect(shouldUsePageTransitionPerformanceFallback()).toBe(false)
  })

  it('enables fallback for Safari', () => {
    setNavigatorStub({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
      platform: 'MacIntel',
      userAgentData: {
        brands: [],
        platform: 'macOS',
      },
    })

    expect(shouldUsePageTransitionPerformanceFallback()).toBe(true)
  })

  it('keeps fallback disabled for non-Windows Chromium and non-Safari browsers', () => {
    setNavigatorStub({
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      platform: 'Linux x86_64',
      userAgentData: {
        brands: [{ brand: 'Chromium' }],
        platform: 'Linux',
      },
    })

    expect(shouldUsePageTransitionPerformanceFallback()).toBe(false)
  })
})
