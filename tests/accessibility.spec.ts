import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function expectNoAxeViolations(page: Page) {
  const transition = page.locator('.public-route-transition');
  if ((await transition.count()) > 0) {
    await expect(transition).toHaveCSS('opacity', '1');
  }
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual(
    [],
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('model-portfolio:intro-played:v3', 'true');
  });
});

test('public routes and both INDEX modes have no axe violations', async ({
  page,
}) => {
  for (const route of [
    '/',
    '/archive',
    '/shoots/studio-portraits',
    '/profile',
  ]) {
    await page.goto(route);
    await expectNoAxeViolations(page);
  }

  await page.goto('/');
  await page.getByRole('button', { name: 'Show vertical index' }).click();
  await expect(page.locator('.index-gallery-stage')).toHaveAttribute(
    'data-index-transitioning',
    'false',
    { timeout: 3000 },
  );
  await expectNoAxeViolations(page);
});

test('INDEX exposes one logical keyboard stop and Enter opens it', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('main')).toHaveCount(1);
  const horizontal = page.locator(
    '.index-gallery-view[data-index-view="horizontal"]',
  );
  const activeLink = horizontal.locator(
    '[data-set-index="2"][data-gallery-card][tabindex="0"]',
  );
  await expect(activeLink).toHaveCount(1);
  await activeLink.focus();
  await expect
    .poll(() =>
      horizontal
        .locator('.index-gallery__viewport')
        .evaluate((element) => element.scrollLeft),
    )
    .toBe(0);
  const originalSlug = await activeLink.getAttribute('data-shooting-slug');

  await page.keyboard.press('ArrowRight');
  const focusedSlug = await page
    .locator('[data-gallery-card]:focus')
    .getAttribute('data-shooting-slug');
  expect(focusedSlug).not.toBe(originalSlug);

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/shoots/${focusedSlug}$`));
});

test('INDEX pointer controls move focus without dragging', async ({ page }) => {
  await page.goto('/');
  const before = await page
    .locator('.index-gallery-view.is-active [data-gallery-card][tabindex="0"]')
    .getAttribute('data-shooting-slug');

  await page.getByRole('button', { name: /Next shooting:/ }).click();
  const focused = page.locator(
    '.index-gallery-view.is-active [data-gallery-card]:focus',
  );
  await expect(focused).toBeVisible();
  await expect(focused).not.toHaveAttribute('data-shooting-slug', before ?? '');
});

test('vertical INDEX uses the same roving keyboard contract', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Show vertical index' }).click();
  await expect(page.locator('.index-gallery-stage')).toHaveAttribute(
    'data-index-transitioning',
    'false',
    { timeout: 3000 },
  );

  const vertical = page.locator(
    '.index-gallery-view[data-index-view="vertical"]',
  );
  const activeLink = vertical.locator(
    '[data-set-index="2"][data-gallery-card][tabindex="0"]',
  );
  await expect(activeLink).toHaveCount(1);
  await activeLink.focus();
  const originalSlug = await activeLink.getAttribute('data-shooting-slug');
  await page.keyboard.press('ArrowDown');
  const focused = vertical.locator('[data-gallery-card]:focus');
  await expect(focused).not.toHaveAttribute(
    'data-shooting-slug',
    originalSlug ?? '',
  );
  const focusedSlug = await focused.getAttribute('data-shooting-slug');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/shoots/${focusedSlug}$`));
});

test('language, skip link, mobile menu, and year dialog manage focus', async ({
  page,
}) => {
  await page.goto('/profile');

  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  await page.getByRole('button', { name: 'DE', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(
    page.getByRole('link', { name: 'Zum Inhalt springen' }),
  ).toBeAttached();

  await page.setViewportSize({ width: 390, height: 844 });
  const menuButton = page.locator('.site-nav__menu-trigger');
  await menuButton.click();
  await expect(page.locator('#site-content')).toHaveAttribute('inert', '');
  await expect(
    page.locator('.site-nav__link[aria-current="page"]'),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menuButton).toBeFocused();
  await expect(page.locator('#site-content')).not.toHaveAttribute('inert', '');

  await page.setViewportSize({ width: 1440, height: 900 });
  const yearButton = page.locator('.site-nav__year');
  await yearButton.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Schließen' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Schließen' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(yearButton).toBeFocused();
});

test('client navigation moves focus to the new main content', async ({
  page,
}) => {
  await page.goto('/archive');
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.locator('#main-content')).toBeFocused();

  await page.goBack();
  await expect(page).toHaveURL(/\/archive$/);
  await expect(page.locator('#main-content')).toBeFocused();
});

test('anonymous Studio login is semantically valid', async ({ page }) => {
  await page.goto('/studio/login');
  await expect(page.locator('.studio-shell')).toHaveAttribute('lang', 'en');
  await expectNoAxeViolations(page);
});

test('reduced motion removes the intro, parallax displacement, and layout morph', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000');
    await expect(page.locator('.intro')).toHaveCount(0);
    const centeredImage = page.locator(
      '.index-gallery-view.is-active [data-gallery-card].is-centered img',
    );
    await expect(centeredImage).toBeVisible();
    const translation = await centeredImage.evaluate((image) => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform);
      return { x: matrix.m41, y: matrix.m42 };
    });
    expect(Math.abs(translation.x)).toBeLessThan(0.1);
    expect(Math.abs(translation.y)).toBeLessThan(0.1);

    await page.getByRole('button', { name: 'Show vertical index' }).click();
    await expect(page.locator('.index-gallery-transition__card')).toHaveCount(
      0,
    );
    const verticalImage = page.locator(
      '.index-gallery-view.is-active [data-gallery-card].is-centered img',
    );
    await expect(verticalImage).toBeVisible();
    const verticalTranslation = await verticalImage.evaluate((image) => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform);
      return { x: matrix.m41, y: matrix.m42 };
    });
    expect(Math.abs(verticalTranslation.x)).toBeLessThan(0.1);
    expect(Math.abs(verticalTranslation.y)).toBeLessThan(0.1);
  } finally {
    await context.close();
  }
});

test('the default intro yields immediately to keyboard navigation', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000');
    await expect(page.locator('.intro')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Skip to content' }),
    ).toBeFocused();
    await expect(page.locator('.intro')).toBeHidden({ timeout: 1000 });
  } finally {
    await context.close();
  }
});

test('public content reflows at 320 CSS pixels without losing controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });

  for (const route of ['/archive', '/profile', '/shoots/studio-portraits']) {
    await page.goto(route);
    await page.addStyleTag({
      content: `
        * {
          line-height: 1.5 !important;
          letter-spacing: 0.12em !important;
          word-spacing: 0.16em !important;
        }
        p { margin-bottom: 2em !important; }
      `,
    });
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
    await expect(page.locator('#main-content')).toBeVisible();
  }
});

test('essential public controls meet the 24 CSS-pixel target minimum', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/profile');
  await page.locator('.site-nav__menu-trigger').click();

  const undersized = await page
    .locator('.site-nav a:visible, .site-nav button:visible')
    .evaluateAll((elements) =>
      elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            text: element.textContent?.trim(),
            width: rect.width,
            height: rect.height,
          };
        })
        .filter(({ width, height }) => width < 24 || height < 24),
    );
  expect(undersized).toEqual([]);
});
