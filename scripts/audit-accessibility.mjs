import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const baseUrl = process.env.AUDIT_BASE_URL ?? 'http://localhost:3000';
const routes = [
  '/',
  '/archive',
  '/shoots/studio-portraits',
  '/profile',
  '/studio/login',
];

function formatViolation(route, violation) {
  return {
    route,
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      summary: node.failureSummary,
    })),
  };
}

async function waitForPublicTransition(page) {
  const transition = page.locator('.public-route-transition');
  if ((await transition.count()) === 0) return;
  await page.waitForFunction(
    () =>
      window.getComputedStyle(
        document.querySelector('.public-route-transition'),
      ).opacity === '1',
  );
}

async function scan(page, state, violations) {
  await waitForPublicTransition(page);
  const result = await new AxeBuilder({ page }).analyze();
  violations.push(
    ...result.violations.map((item) => formatViolation(state, item)),
  );
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === 'true'
    ? { channel: 'chrome' }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});

try {
  await context.addInitScript(() => {
    window.sessionStorage.setItem('model-portfolio:intro-played:v3', 'true');
  });

  const violations = [];

  for (const route of routes) {
    const page = await context.newPage();
    await page.goto(new URL(route, baseUrl).toString(), {
      waitUntil: 'domcontentloaded',
    });

    await scan(page, route, violations);

    if (route === '/') {
      await page.getByRole('button', { name: 'Show vertical index' }).click();
      await page.waitForSelector('[data-index-transitioning="false"]');
      await scan(page, '/ (vertical)', violations);
    }

    if (route === '/profile') {
      await page.locator('.site-nav__year').click();
      await page.getByRole('dialog').waitFor();
      await page.waitForFunction(() => {
        const overlay = document.querySelector('.year-overlay');
        const content = document.querySelector('.year-overlay__content');
        return (
          overlay &&
          content &&
          window.getComputedStyle(overlay).opacity === '1' &&
          window.getComputedStyle(content).opacity === '1'
        );
      });
      await scan(page, '/profile (year dialog)', violations);
    }

    await page.close();
  }

  const mobilePage = await context.newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  await mobilePage.goto(new URL('/profile', baseUrl).toString(), {
    waitUntil: 'domcontentloaded',
  });
  await mobilePage.locator('.site-nav__menu-trigger').click();
  await scan(mobilePage, '/profile (mobile menu)', violations);
  await mobilePage.close();

  if (violations.length === 0) {
    console.log('Accessibility audit passed with no axe violations.');
  } else {
    console.log(JSON.stringify(violations, null, 2));
    process.exitCode = 1;
  }
} finally {
  await context.close();
  await browser.close();
}
