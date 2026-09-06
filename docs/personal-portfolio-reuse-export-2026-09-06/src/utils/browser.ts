type NavigatorWithUAData = Navigator & {
  userAgentData?: {
    brands?: Array<{ brand?: string }>
    platform?: string
  }
}

function getNavigatorSnapshot() {
  if (typeof navigator === 'undefined') {
    return {
      brands: [] as Array<{ brand?: string }>,
      platform: '',
      uaDataPlatform: '',
      userAgent: '',
    }
  }

  const navigatorWithUAData = navigator as NavigatorWithUAData
  return {
    brands: navigatorWithUAData.userAgentData?.brands ?? [],
    platform: navigator.platform || '',
    uaDataPlatform: navigatorWithUAData.userAgentData?.platform || '',
    userAgent: navigator.userAgent || '',
  }
}

export function isWindowsChromiumBrowser() {
  const { brands, platform, uaDataPlatform, userAgent } = getNavigatorSnapshot()
  if (!userAgent && !platform && !uaDataPlatform && brands.length === 0) {
    return false
  }

  const isWindowsPlatform =
    /windows/i.test(userAgent) || /win/i.test(uaDataPlatform) || /win/i.test(platform)

  const hasChromiumBrand = brands.some((entry) => {
    const brand = (entry.brand ?? '').toLowerCase()
    return brand.includes('chrom') || brand.includes('edge')
  })
  const hasChromiumUserAgent = /chrom(e|ium)\//i.test(userAgent)
  const isOpera = /opr\//i.test(userAgent)

  return isWindowsPlatform && (hasChromiumBrand || hasChromiumUserAgent) && !isOpera
}

export function isSafariBrowser() {
  const { userAgent } = getNavigatorSnapshot()
  if (!userAgent) {
    return false
  }

  const isWebKit = /safari\//i.test(userAgent)
  const isChromiumFamily = /chrom(e|ium)\//i.test(userAgent) || /edg\//i.test(userAgent) || /opr\//i.test(userAgent)
  const isFirefox = /firefox\//i.test(userAgent)
  return isWebKit && !isChromiumFamily && !isFirefox
}

export function shouldUsePageTransitionPerformanceFallback() {
  return isSafariBrowser()
}
