const MAX_SLUG_LENGTH = 80;

export function createSlug(value: string) {
  return value
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
}

export function isCanonicalSlug(value: string) {
  return (
    value.length > 0 &&
    value.length <= MAX_SLUG_LENGTH &&
    value === createSlug(value)
  );
}
