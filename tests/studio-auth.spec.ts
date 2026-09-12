import { expect, test } from '@playwright/test';

test.describe('Studio authentication boundary', () => {
  test('redirects anonymous visitors to the private login', async ({
    page,
  }) => {
    await page.goto('/studio');

    await expect(page).toHaveURL(/\/studio\/login$/);
    await expect(page.getByRole('heading', { name: 'Studio' })).toBeVisible();
    await expect(page.locator('.site-nav')).toBeHidden();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
  });

  test('returns a generic error for invalid credentials', async ({ page }) => {
    await page.goto('/studio/login');
    await page.getByLabel('Email').fill('unknown@example.com');
    await page.getByLabel('Password').fill('a-password-that-is-wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.locator('.studio-login-form__status')).toHaveText(
      'The email or password is incorrect.',
    );
    await expect(page).toHaveURL(/\/studio\/login$/);
  });

  test('does not expose public account registration', async ({ request }) => {
    const response = await request.post('/api/auth/sign-up/email', {
      data: {
        name: 'Unexpected user',
        email: 'unexpected@example.com',
        password: 'a-valid-looking-password',
      },
    });

    expect(response.ok()).toBeFalsy();
  });

  test('does not issue anonymous Studio upload tokens', async ({ request }) => {
    const shootingId = '11111111-1111-4111-8111-111111111111';
    const response = await request.post('/api/studio/uploads', {
      data: {
        type: 'blob.generate-client-token',
        payload: {
          pathname: `shootings/${shootingId}/test.jpg`,
          multipart: false,
          clientPayload: JSON.stringify({ shootingId }),
        },
      },
    });

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Studio authentication is required.',
    });
  });
});
