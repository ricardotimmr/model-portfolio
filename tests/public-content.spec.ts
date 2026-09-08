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

  await page.getByRole('button', { name: 'Show vertical index' }).click();
  const verticalView = page.locator(
    '.index-gallery-view[data-index-view="vertical"]',
  );
  await expect(verticalView).toHaveClass(/is-active/);
  await expect(
    verticalView.locator('.vertical-gallery__metadata'),
  ).toContainText(/Studio Portraits|Summer Afternoon|Mountain Light/);

  await expect(
    page.getByRole('button', { name: 'Show horizontal index' }),
  ).toBeEnabled({ timeout: 3000 });
  await page.getByRole('button', { name: 'Show horizontal index' }).click();
  await expect(horizontalView).toHaveClass(/is-active/);
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

test('profile portrait reuses a database-backed Blob asset', async ({
  page,
}) => {
  await page.goto('/profile');

  await expect(page.locator('.profile-portrait img')).toHaveAttribute(
    'src',
    /\.public\.blob\.vercel-storage\.com/,
  );
});
