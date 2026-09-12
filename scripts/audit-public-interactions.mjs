import { chromium } from '@playwright/test';

const BASE_URL_ARGUMENT = '--base-url=';
const PROFILE_ARGUMENT = '--profile=';
const requestedBaseUrl = process.argv
  .find((argument) => argument.startsWith(BASE_URL_ARGUMENT))
  ?.slice(BASE_URL_ARGUMENT.length);
const baseUrl = (requestedBaseUrl || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const requestedProfile = process.argv
  .find((argument) => argument.startsWith(PROFILE_ARGUMENT))
  ?.slice(PROFILE_ARGUMENT.length);

const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 } },
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];

async function startSampling(page) {
  await page.evaluate(() => {
    window.__portfolioInteractionAudit = {
      frames: [],
      longTasks: [],
      running: true,
    };

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__portfolioInteractionAudit.longTasks.push(entry.duration);
      }
    }).observe({ type: 'longtask', buffered: true });

    let previousFrame;
    const sampleFrame = (timestamp) => {
      const audit = window.__portfolioInteractionAudit;
      if (!audit.running) return;
      if (previousFrame !== undefined)
        audit.frames.push(timestamp - previousFrame);
      previousFrame = timestamp;
      window.requestAnimationFrame(sampleFrame);
    };
    window.requestAnimationFrame(sampleFrame);
  });
}

async function stopSampling(page) {
  return page.evaluate(() => {
    const audit = window.__portfolioInteractionAudit;
    audit.running = false;
    return {
      sampledFrames: audit.frames.length,
      slowFramesOver34ms: audit.frames.filter((duration) => duration > 34)
        .length,
      longestFrameMs: Math.round(Math.max(0, ...audit.frames)),
      longTaskCount: audit.longTasks.length,
      longestLongTaskMs: Math.round(Math.max(0, ...audit.longTasks)),
    };
  });
}

async function toggleIndexMode(page) {
  const stage = page.locator('.index-gallery-stage');
  const previousMode = await stage.getAttribute('data-index-view');
  const menuTrigger = page.locator('.site-nav__menu-trigger');
  if (await menuTrigger.isVisible()) await menuTrigger.click();
  await page.locator('.site-nav__link.is-active').click();
  await page.waitForFunction(
    (previous) => {
      const gallery = document.querySelector('.index-gallery-stage');
      return (
        gallery?.getAttribute('data-index-view') !== previous &&
        gallery?.getAttribute('data-index-transitioning') === 'false'
      );
    },
    previousMode,
    { timeout: 4000 },
  );
}

async function inspectVisibleImages(page) {
  return page.locator('img').evaluateAll((images) =>
    images
      .map((image) => {
        const rect = image.getBoundingClientRect();
        return {
          alt: image.alt,
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          visible:
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth,
        };
      })
      .filter(
        (image) =>
          image.visible && (!image.complete || image.naturalWidth === 0),
      ),
  );
}

for (const profile of profiles.filter(
  ({ name }) => !requestedProfile || name === requestedProfile,
)) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    hasTouch: profile.name === 'mobile',
    isMobile: profile.name === 'mobile',
    deviceScaleFactor: profile.name === 'mobile' ? 3 : 1,
  });
  await context.addInitScript(() => {
    window.sessionStorage.setItem('model-portfolio:intro-played:v3', 'true');
    window.sessionStorage.setItem('model-portfolio:gallery-used', 'true');
  });

  const indexPage = await context.newPage();
  await indexPage.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await startSampling(indexPage);

  const horizontalTrack = indexPage.locator(
    '[data-index-view="horizontal"] .index-gallery__track',
  );
  const beforeWheel = await horizontalTrack.getAttribute('style');
  const wheelStartedAt = Date.now();
  await indexPage.mouse.move(
    profile.viewport.width / 2,
    profile.viewport.height / 2,
  );
  await indexPage.mouse.wheel(0, 900);
  await indexPage.waitForFunction(
    (previous) =>
      document
        .querySelector('[data-index-view="horizontal"] .index-gallery__track')
        ?.getAttribute('style') !== previous,
    beforeWheel,
  );
  const horizontalWheelResponseMs = Date.now() - wheelStartedAt;

  await toggleIndexMode(indexPage);
  const verticalViewport = indexPage.locator('.vertical-gallery__viewport');
  const beforeVerticalScroll = await verticalViewport.evaluate(
    (viewport) => viewport.scrollTop,
  );
  const verticalStartedAt = Date.now();
  await indexPage.mouse.move(
    profile.viewport.width / 2,
    profile.viewport.height / 2,
  );
  await indexPage.mouse.wheel(0, 900);
  await indexPage.waitForFunction(
    (previous) =>
      (document.querySelector('.vertical-gallery__viewport')?.scrollTop ??
        0) !== previous,
    beforeVerticalScroll,
  );
  const verticalScrollResponseMs = Date.now() - verticalStartedAt;

  const modeSwitchDurationsMs = [];
  for (let index = 0; index < 4; index += 1) {
    const startedAt = Date.now();
    await toggleIndexMode(indexPage);
    modeSwitchDurationsMs.push(Date.now() - startedAt);
  }
  const indexRuntime = await stopSampling(indexPage);
  results.push({
    profile: profile.name,
    scenario: 'index-stress',
    horizontalWheelResponseMs,
    verticalScrollResponseMs,
    modeSwitchDurationsMs,
    visibleUndecodedImages: await inspectVisibleImages(indexPage),
    ...indexRuntime,
  });
  await indexPage.close();

  for (const route of [
    { name: 'archive-fast-scroll', path: '/archive' },
    { name: 'shooting-fast-scroll', path: '/shoots/studio-portraits' },
  ]) {
    const page = await context.newPage();
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle' });
    await startSampling(page);
    const scrollStartedAt = Date.now();
    await page.evaluate(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight });
    });
    await page.waitForTimeout(800);
    const runtime = await stopSampling(page);
    results.push({
      profile: profile.name,
      scenario: route.name,
      scrollAndDecodeWindowMs: Date.now() - scrollStartedAt,
      visibleUndecodedImages: await inspectVisibleImages(page),
      ...runtime,
    });
    await page.close();
  }

  await context.close();
}

await browser.close();
console.log(JSON.stringify({ baseUrl, results }, null, 2));
