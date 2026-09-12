import { chromium } from '@playwright/test';

const BASE_URL_ARGUMENT = '--base-url=';
const SCENARIO_ARGUMENT = '--scenario=';
const PROFILE_ARGUMENT = '--profile=';
const compactOutput = process.argv.includes('--compact');
const requestedBaseUrl = process.argv
  .find((argument) => argument.startsWith(BASE_URL_ARGUMENT))
  ?.slice(BASE_URL_ARGUMENT.length);
const baseUrl = (requestedBaseUrl || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const requestedScenario = process.argv
  .find((argument) => argument.startsWith(SCENARIO_ARGUMENT))
  ?.slice(SCENARIO_ARGUMENT.length);
const requestedProfile = process.argv
  .find((argument) => argument.startsWith(PROFILE_ARGUMENT))
  ?.slice(PROFILE_ARGUMENT.length);

const profiles = [
  {
    name: 'desktop',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
  },
  {
    name: 'mobile',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  },
];

const scenarios = [
  { name: 'index-fresh', path: '/', skipIntro: false },
  { name: 'index-repeat', path: '/', skipIntro: true },
  { name: 'archive', path: '/archive', skipIntro: true },
  {
    name: 'shooting',
    path: '/shoots/studio-portraits',
    skipIntro: true,
  },
  { name: 'profile', path: '/profile', skipIntro: true },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];

for (const profile of profiles.filter(
  ({ name }) => !requestedProfile || name === requestedProfile,
)) {
  for (const scenario of scenarios.filter(
    ({ name }) => !requestedScenario || name === requestedScenario,
  )) {
    const context = await browser.newContext({
      viewport: profile.viewport,
      deviceScaleFactor: profile.deviceScaleFactor,
      hasTouch: profile.hasTouch,
      isMobile: profile.isMobile,
    });

    await context.addInitScript(({ skipIntro }) => {
      if (skipIntro) {
        window.sessionStorage.setItem(
          'model-portfolio:intro-played:v3',
          'true',
        );
      }

      window.__portfolioPerformance = {
        cls: 0,
        layoutShifts: [],
        lcp: null,
        longTasks: [],
      };

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__portfolioPerformance.cls += entry.value;
            window.__portfolioPerformance.layoutShifts.push({
              startTime: entry.startTime,
              value: entry.value,
              sources: (entry.sources || []).map((source) => ({
                node:
                  source.node?.className ||
                  source.node?.id ||
                  source.node?.tagName ||
                  null,
                previousRect: source.previousRect,
                currentRect: source.currentRect,
              })),
            });
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });

      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const entry = entries.at(-1);
        if (!entry) return;
        window.__portfolioPerformance.lcp = {
          startTime: entry.startTime,
          size: entry.size,
          element:
            entry.element?.getAttribute?.('alt') ||
            entry.element?.textContent?.trim().slice(0, 80) ||
            entry.element?.tagName ||
            null,
        };
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__portfolioPerformance.longTasks.push({
            startTime: entry.startTime,
            duration: entry.duration,
          });
        }
      }).observe({ type: 'longtask', buffered: true });
    }, scenario);

    const page = await context.newPage();
    await page.goto(`${baseUrl}${scenario.path}`, { waitUntil: 'networkidle' });

    if (scenario.name === 'index-fresh') {
      await page.locator('.intro').waitFor({
        state: 'hidden',
        timeout: 10_000,
      });
      await page.waitForTimeout(250);
    }

    const metrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const images = Array.from(document.images);
      const imageResources = resources.filter((entry) => {
        try {
          return new URL(entry.name).pathname === '/_next/image';
        } catch {
          return entry.initiatorType === 'img';
        }
      });
      const scriptResources = resources.filter(
        (entry) => entry.initiatorType === 'script',
      );
      const routePrefetchResources = resources.filter((entry) => {
        try {
          return new URL(entry.name).searchParams.has('_rsc');
        } catch {
          return false;
        }
      });
      const fontResources = resources.filter(
        (entry) =>
          entry.initiatorType === 'css' &&
          /\.(woff2?|ttf|otf)(\?|$)/i.test(entry.name),
      );
      const navigation = performance.getEntriesByType('navigation')[0];

      const imageDetails = images.map((image) => {
        const rect = image.getBoundingClientRect();
        const source = image.currentSrc || image.src;
        let optimizedWidth = null;
        let quality = null;
        try {
          const url = new URL(source);
          optimizedWidth = url.searchParams.get('w');
          quality = url.searchParams.get('q');
        } catch {}

        return {
          alt: image.alt,
          loading: image.loading,
          fetchPriority: image.fetchPriority,
          complete: image.complete,
          renderedWidth: Math.round(rect.width),
          renderedHeight: Math.round(rect.height),
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          optimizedWidth: optimizedWidth ? Number(optimizedWidth) : null,
          quality: quality ? Number(quality) : null,
          visible:
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth,
          source,
        };
      });

      const sumTransfer = (entries) =>
        Math.round(
          entries.reduce((sum, entry) => sum + entry.transferSize, 0) / 1024,
        );
      const uniqueImageSources = new Set(
        imageDetails.map((image) => image.source),
      );
      const optimizedWidths = [
        ...new Set(
          imageDetails
            .map((image) => image.optimizedWidth)
            .filter((width) => width !== null),
        ),
      ].sort((a, b) => a - b);

      return {
        navigation: navigation
          ? {
              ttfb: Math.round(
                navigation.responseStart - navigation.requestStart,
              ),
              domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
              load: Math.round(navigation.loadEventEnd),
            }
          : null,
        vitals: window.__portfolioPerformance,
        resources: {
          count: resources.length,
          transferKiB: sumTransfer(resources),
          images: imageResources.length,
          imageTransferKiB: sumTransfer(imageResources),
          scripts: scriptResources.length,
          scriptTransferKiB: sumTransfer(scriptResources),
          routePrefetches: routePrefetchResources.length,
          routePrefetchTransferKiB: sumTransfer(routePrefetchResources),
          fonts: fontResources.length,
          fontTransferKiB: sumTransfer(fontResources),
        },
        domImages: {
          count: images.length,
          uniqueCurrentSources: uniqueImageSources.size,
          loaded: imageDetails.filter(
            (image) => image.complete && image.naturalWidth > 0,
          ).length,
          eager: imageDetails.filter((image) => image.loading === 'eager')
            .length,
          lazy: imageDetails.filter((image) => image.loading === 'lazy').length,
          highPriority: imageDetails.filter(
            (image) => image.fetchPriority === 'high',
          ).length,
          visible: imageDetails.filter((image) => image.visible).length,
          optimizedWidths,
        },
        oversizedImages: imageDetails
          .filter(
            (image) =>
              image.visible &&
              image.optimizedWidth &&
              image.renderedWidth > 0 &&
              image.optimizedWidth >
                image.renderedWidth * window.devicePixelRatio * 1.3,
          )
          .map((image) => ({
            alt: image.alt,
            renderedWidth: image.renderedWidth,
            devicePixelRatio: window.devicePixelRatio,
            optimizedWidth: image.optimizedWidth,
          })),
      };
    });

    results.push({
      profile: profile.name,
      scenario: scenario.name,
      url: `${baseUrl}${scenario.path}`,
      ...metrics,
    });
    await context.close();
  }
}

await browser.close();

const outputResults = compactOutput
  ? results.map((result) => ({
      ...result,
      vitals: {
        cls: result.vitals.cls,
        lcp: result.vitals.lcp,
        layoutShifts: result.vitals.layoutShifts,
        longTaskCount: result.vitals.longTasks.length,
        longestLongTask: Math.round(
          Math.max(
            0,
            ...result.vitals.longTasks.map(({ duration }) => duration),
          ),
        ),
      },
    }))
  : results;

console.log(JSON.stringify({ baseUrl, results: outputResults }, null, 2));
