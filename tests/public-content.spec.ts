import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('model-portfolio:intro-played:v3', 'true');
  });
});

test('database-backed index keeps both gallery modes interactive', async ({
  page,
}) => {
  await page.goto('/');

  const horizontalView = page.locator(
    '.index-gallery-view[data-index-view="horizontal"]',
  );
  const horizontalTrack = horizontalView.locator('.index-gallery__track');

  await expect(horizontalView).toHaveClass(/is-active/);
  await expect(
    horizontalView.locator('[data-set-index="2"][data-gallery-card]'),
  ).toHaveCount(3);
  await expect(horizontalView.locator('img').first()).toHaveAttribute(
    'src',
    /\.public\.blob\.vercel-storage\.com/,
  );

  const beforeWheel = await horizontalTrack.getAttribute('style');
  await page.mouse.move(720, 500);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(500);
  const afterWheel = await horizontalTrack.getAttribute('style');
  expect(afterWheel).not.toBe(beforeWheel);
  const horizontalSlug = await horizontalView
    .locator('[data-gallery-card].is-centered')
    .getAttribute('data-shooting-slug');

  await page.getByRole('button', { name: 'Show vertical index' }).click();
  await expect(page.locator('.index-gallery-transition__card')).toHaveCount(5);
  const verticalView = page.locator(
    '.index-gallery-view[data-index-view="vertical"]',
  );
  await expect(verticalView).toHaveClass(/is-active/);
  await expect(
    verticalView.locator('[data-gallery-card].is-centered'),
  ).toHaveAttribute('data-shooting-slug', horizontalSlug ?? '');
  await expect(
    verticalView.locator('.vertical-gallery__metadata'),
  ).toContainText(/Studio Portraits|Summer Afternoon|Mountain Light/);

  await expect(
    page.getByRole('button', { name: 'Show horizontal index' }),
  ).toBeEnabled({ timeout: 3000 });
  await page.getByRole('button', { name: 'Show horizontal index' }).click();
  await expect(horizontalView).toHaveClass(/is-active/);

  await expect(
    page.getByRole('button', { name: 'Show vertical index' }),
  ).toBeEnabled({ timeout: 3000 });
  const beforeReturnWheel = await horizontalTrack.getAttribute('style');
  await page.mouse.move(720, 500);
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(500);
  const afterReturnWheel = await horizontalTrack.getAttribute('style');
  expect(afterReturnWheel).not.toBe(beforeReturnWheel);
});

test('index mode change has a short stable reduced-motion path', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await page.getByRole('button', { name: 'Show vertical index' }).click();
  await expect(
    page.getByRole('button', { name: 'Show horizontal index' }),
  ).toBeEnabled({ timeout: 1000 });
  await expect(page.locator('.index-gallery-transition__card')).toHaveCount(0);
  await expect(
    page.locator('.index-gallery-view[data-index-view="vertical"]'),
  ).toHaveClass(/is-active/);
});

test('mobile index keeps vertical imagery clear and survives orientation changes', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await context.addInitScript(() => {
    window.sessionStorage.setItem('model-portfolio:intro-played:v3', 'true');
    window.sessionStorage.setItem('model-portfolio:gallery-used', 'true');
  });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000');
    await page.locator('.site-nav__menu-trigger').click();
    await page.locator('.site-nav__link.is-active').click();
    await expect(
      page.locator(
        '.index-gallery-view[data-index-view="vertical"] .vertical-gallery__metadata',
      ),
    ).toBeHidden();
    await expect(
      page.locator(
        '.index-gallery-view[data-index-view="vertical"] .index-gallery__action',
      ),
    ).toBeHidden();
    await expect(
      page
        .locator(
          '.index-gallery-view[data-index-view="vertical"] [data-gallery-card].is-centered .index-gallery__caption-open',
        )
        .first(),
    ).toContainText(/open/i);

    await page.locator('.site-nav__menu-trigger').click();
    await page.locator('.site-nav__link.is-active').click();
    await expect(page.locator('.index-gallery-stage')).toHaveAttribute(
      'data-index-transitioning',
      'false',
      { timeout: 5000 },
    );
    await expect(page.locator('.site-nav__link.is-active')).toBeEnabled();
    const centeredBefore = await page
      .locator(
        '.index-gallery-view[data-index-view="horizontal"] [data-gallery-card].is-centered',
      )
      .getAttribute('data-shooting-slug');

    await page.setViewportSize({ width: 844, height: 390 });
    await expect(
      page.locator(
        '.index-gallery-view[data-index-view="horizontal"] [data-gallery-card].is-centered',
      ),
    ).toHaveAttribute('data-shooting-slug', centeredBefore ?? '');
    await expect(page.locator('.index-gallery-stage')).toHaveAttribute(
      'data-index-transitioning',
      'false',
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.site-nav__menu-trigger').click();
    await page.getByRole('button', { name: 'DE', exact: true }).click();
    await expect(page.locator('.site-nav__menu-trigger')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(page.locator('body')).toHaveCSS('overflow', 'visible');
  } finally {
    await context.close();
  }
});

test('first-session intro remeasures after resize and only plays once', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000');
    await expect(page.locator('.intro')).toBeVisible();
    await expect(page.locator('.intro__tile')).toHaveCount(5);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.intro')).toBeHidden({ timeout: 8000 });
    await expect(page.locator('body')).toHaveCSS('overflow', 'visible');

    const centeredCard = page.locator(
      '.index-gallery-view[data-index-view="horizontal"] [data-gallery-card].is-centered',
    );
    const centeredBox = await centeredCard.boundingBox();
    expect(centeredBox).not.toBeNull();
    expect(
      Math.abs((centeredBox?.x ?? 0) + (centeredBox?.width ?? 0) / 2 - 195),
    ).toBeLessThan(1);

    await page.reload();
    await expect(page.locator('.intro')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('first-session intro expands without layout shift or a largest-fallback image request', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(() => {
    type LayoutShiftEntry = PerformanceEntry & {
      hadRecentInput: boolean;
      value: number;
    };
    const performanceWindow = window as Window & { __introCls?: number };
    performanceWindow.__introCls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (!entry.hadRecentInput) {
          performanceWindow.__introCls =
            (performanceWindow.__introCls ?? 0) + entry.value;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const page = await context.newPage();
  const imageRequests: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/_next/image?')) imageRequests.push(url);
  });

  try {
    await page.goto('http://localhost:3000');
    await expect(page.locator('.intro')).toBeVisible();
    await expect(page.locator('.intro')).toBeHidden({ timeout: 8000 });
    await page.waitForTimeout(100);

    const cls = await page.evaluate(
      () =>
        (window as Window & { __introCls?: number }).__introCls ??
        Number.POSITIVE_INFINITY,
    );
    expect(cls).toBeLessThan(0.01);
    expect(
      imageRequests.some(
        (url) => new URL(url).searchParams.get('w') === '3840',
      ),
    ).toBe(false);
  } finally {
    await context.close();
  }
});

test('intro remeasures height-only viewport changes before the gallery handoff', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 760 },
  });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000');
    await expect(page.locator('.intro')).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 840 });
    await page.waitForFunction(
      () =>
        document.querySelector('.intro')?.getAttribute('data-intro-phase') ===
        'expanding',
      undefined,
      { timeout: 8000 },
    );
    await page.waitForTimeout(1250);

    const maximumEdgeDifference = await page.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll('.intro__tile')).map(
        (tile) => tile.getBoundingClientRect(),
      );
      const cards = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.index-gallery-view.is-active [data-gallery-card]',
        ),
      )
        .map((card) => {
          const rect = card.getBoundingClientRect();
          return {
            rect,
            distance: Math.abs(
              rect.left + rect.width / 2 - window.innerWidth / 2,
            ),
          };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)
        .sort((a, b) => a.rect.left - b.rect.left)
        .map(({ rect }) => rect);

      return Math.max(
        ...tiles.flatMap((tile, index) => {
          const card = cards[index];
          if (!card) return [Number.POSITIVE_INFINITY];
          return [
            Math.abs(tile.top - card.top),
            Math.abs(tile.right - card.right),
            Math.abs(tile.bottom - card.bottom),
            Math.abs(tile.left - card.left),
          ];
        }),
      );
    });

    expect(maximumEdgeDifference).toBeLessThan(1);
    await expect(page.locator('.intro')).toBeHidden({ timeout: 3000 });
  } finally {
    await context.close();
  }
});

test('lookbook and shooting pages render seeded localized content', async ({
  page,
}) => {
  await page.goto('/archive');
  await expect(page.locator('.archive-item')).toHaveCount(24);
  await expect(page.locator('.archive-item img').first()).toHaveAttribute(
    'src',
    /\.public\.blob\.vercel-storage\.com/,
  );

  await page.getByRole('button', { name: 'DE', exact: true }).click();
  await expect(page.locator('.page-heading')).toContainText(
    'Ausgewählte Fotografien',
  );

  await page.locator('.archive-item').first().click();
  await expect(page).toHaveURL(/\/shoots\/studio-portraits$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Studio Portraits',
  );
  await expect(page.locator('.editorial-flow img')).toHaveCount(10);
  await expect(page.locator('.shooting-header__description')).toContainText(
    'Studioserie',
  );

  const response = await page.goto('/shoots/not-a-published-shooting');
  expect(response?.status()).toBe(404);
});

test('vertical index selection survives public route navigation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Show vertical index' }).click();
  await expect(
    page.getByRole('button', { name: 'Show horizontal index' }),
  ).toBeEnabled({ timeout: 3000 });

  const verticalView = page.locator(
    '.index-gallery-view[data-index-view="vertical"]',
  );
  await verticalView
    .locator('.vertical-gallery__viewport')
    .evaluate((element) => {
      element.scrollTop += 900;
    });
  await page.waitForTimeout(250);
  const activeSlug = await verticalView
    .locator('[data-gallery-card].is-centered')
    .getAttribute('data-shooting-slug');

  await page.getByRole('link', { name: 'Lookbook' }).click();
  await expect(page).toHaveURL(/\/archive$/);
  await page.getByRole('link', { name: 'Index' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(verticalView).toHaveClass(/is-active/);
  await expect(
    verticalView.locator('[data-gallery-card].is-centered'),
  ).toHaveAttribute('data-shooting-slug', activeSlug ?? '');
});

test('year overlay restores focus and Studio skips public route motion', async ({
  page,
}) => {
  await page.goto('/profile');
  const yearButton = page.locator('.site-nav__year');
  await yearButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(yearButton).toBeFocused();
  await expect(page.locator('body')).toHaveCSS('overflow', 'visible');

  await page.goto('/studio/login');
  await expect(page.locator('.public-route-transition')).toHaveCount(0);
});

test('profile portrait reuses a database-backed Blob asset', async ({
  page,
}) => {
  await page.goto('/profile');

  await expect(page.locator('.profile-portrait img')).toHaveAttribute(
    'src',
    /\.public\.blob\.vercel-storage\.com/,
  );
});
