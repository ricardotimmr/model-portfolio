const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAdminEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validateAdminEmail(value: string) {
  const email = normalizeAdminEmail(value);

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    throw new Error('Enter a valid email address.');
  }

  return email;
}
