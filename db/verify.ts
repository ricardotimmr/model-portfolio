import { randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

const { loadEnvConfig } = nextEnv;

type IdRow = { id: string };

function hasPostgresCode(error: unknown, code: string) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

function assertIds(label: string, rows: IdRow[], expectedIds: string[]) {
  const actual = rows.map(({ id }) => id).sort();
  const expected = [...expectedIds].sort();

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label} failed. Expected ${expected.join(', ')}, received ${actual.join(', ')}.`,
    );
  }
}

async function verifyPublicFilters(sql: NeonQueryFunction<false, false>) {
  const marker = randomUUID();
  const slugs = {
    draft: `__verify-draft-${marker}`,
    archived: `__verify-archived-${marker}`,
    unfeatured: `__verify-unfeatured-${marker}`,
    published: `__verify-published-${marker}`,
    invalidCover: `__verify-invalid-cover-${marker}`,
  };
  const shootingIds = Object.fromEntries(
    Object.keys(slugs).map((key) => [key, randomUUID()]),
  ) as Record<keyof typeof slugs, string>;
  const photoIds = {
    draft: randomUUID(),
    archived: randomUUID(),
    unfeatured: randomUUID(),
    published: randomUUID(),
    archiveHidden: randomUUID(),
    shootingHidden: randomUUID(),
  };

  let indexPosition = -1;
  let archivePosition = -1;
  let detailPosition = -1;

  const results = await sql.transaction((transaction) => {
    const statements = [];

    statements.push(transaction`
      insert into shootings (id, slug, title, year, featured_on_index, index_order, status)
      values
        (${shootingIds.draft}, ${slugs.draft}, 'Draft verification', 2026, true, 9001, 'draft'),
        (${shootingIds.archived}, ${slugs.archived}, 'Archived verification', 2026, true, 9002, 'archived'),
        (${shootingIds.unfeatured}, ${slugs.unfeatured}, 'Unfeatured verification', 2026, false, 9003, 'published'),
        (${shootingIds.published}, ${slugs.published}, 'Published verification', 2026, true, 9004, 'published'),
        (${shootingIds.invalidCover}, ${slugs.invalidCover}, 'Invalid cover verification', 2026, true, 9005, 'published')
    `);

    statements.push(transaction`
      insert into photos (
        id, shooting_id, url, width, height, aspect_ratio, orientation,
        sort_order, archive_visible, shooting_visible
      ) values
        (${photoIds.draft}, ${shootingIds.draft}, '/verify/draft.jpg', 100, 100, 1, 'square', 0, true, true),
        (${photoIds.archived}, ${shootingIds.archived}, '/verify/archived.jpg', 100, 100, 1, 'square', 0, true, true),
        (${photoIds.unfeatured}, ${shootingIds.unfeatured}, '/verify/unfeatured.jpg', 100, 100, 1, 'square', 0, true, true),
        (${photoIds.published}, ${shootingIds.published}, '/verify/published.jpg', 100, 100, 1, 'square', 0, true, true),
        (${photoIds.archiveHidden}, ${shootingIds.published}, '/verify/archive-hidden.jpg', 100, 100, 1, 'square', 1, false, true),
        (${photoIds.shootingHidden}, ${shootingIds.published}, '/verify/shooting-hidden.jpg', 100, 100, 1, 'square', 2, true, false)
    `);

    statements.push(transaction`
      update shootings
      set cover_photo_id = case
        when id = ${shootingIds.draft} then ${photoIds.draft}::uuid
        when id = ${shootingIds.archived} then ${photoIds.archived}::uuid
        when id = ${shootingIds.unfeatured} then ${photoIds.unfeatured}::uuid
        when id = ${shootingIds.published} then ${photoIds.published}::uuid
        when id = ${shootingIds.invalidCover} then ${photoIds.published}::uuid
      end
      where slug like ${`__verify-%-${marker}`}
    `);

    indexPosition =
      statements.push(transaction`
      select s.id
      from shootings s
      join photos p on p.id = s.cover_photo_id and p.shooting_id = s.id
      where s.status = 'published'
        and s.featured_on_index = true
        and s.slug like ${`__verify-%-${marker}`}
    `) - 1;

    archivePosition =
      statements.push(transaction`
      select p.id
      from photos p
      join shootings s on s.id = p.shooting_id
      where s.status = 'published'
        and p.archive_visible = true
        and s.slug like ${`__verify-%-${marker}`}
    `) - 1;

    detailPosition =
      statements.push(transaction`
      select p.id
      from photos p
      join shootings s on s.id = p.shooting_id
      where s.status = 'published'
        and p.shooting_visible = true
        and s.id = ${shootingIds.published}
    `) - 1;

    statements.push(transaction`
      delete from shootings where slug like ${`__verify-%-${marker}`}
    `);

    return statements;
  });

  assertIds('INDEX publication filter', results[indexPosition] as IdRow[], [
    shootingIds.published,
  ]);
  assertIds(
    'LOOKBOOK publication filter',
    results[archivePosition] as IdRow[],
    [photoIds.unfeatured, photoIds.published, photoIds.shootingHidden],
  );
  assertIds('Shooting visibility filter', results[detailPosition] as IdRow[], [
    photoIds.published,
    photoIds.archiveHidden,
  ]);
}

async function verifyDuplicateSlug(sql: NeonQueryFunction<false, false>) {
  const slug = `__verify-duplicate-${randomUUID()}`;

  try {
    await sql.transaction((transaction) => [
      transaction`
        insert into shootings (id, slug, title, year, status)
        values (${randomUUID()}, ${slug}, 'Duplicate A', 2026, 'draft')
      `,
      transaction`
        insert into shootings (id, slug, title, year, status)
        values (${randomUUID()}, ${slug}, 'Duplicate B', 2026, 'draft')
      `,
    ]);
  } catch (error) {
    if (hasPostgresCode(error, '23505')) return;
    throw error;
  }

  throw new Error('Duplicate shooting slugs were not rejected.');
}

async function verifyDuplicatePhotoOrder(sql: NeonQueryFunction<false, false>) {
  const shootingId = randomUUID();

  try {
    await sql.transaction((transaction) => [
      transaction`
        insert into shootings (id, slug, title, year, status)
        values (${shootingId}, ${`__verify-order-${randomUUID()}`}, 'Order verification', 2026, 'draft')
      `,
      transaction`
        insert into photos (
          id, shooting_id, url, width, height, aspect_ratio, orientation, sort_order
        ) values
          (${randomUUID()}, ${shootingId}, '/verify/order-a.jpg', 100, 100, 1, 'square', 0),
          (${randomUUID()}, ${shootingId}, '/verify/order-b.jpg', 100, 100, 1, 'square', 0)
      `,
    ]);
  } catch (error) {
    if (hasPostgresCode(error, '23505')) return;
    throw error;
  }

  throw new Error('Duplicate photo sort orders were not rejected.');
}

async function verify() {
  loadEnvConfig(process.cwd());

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is missing. Pull the Development environment variables from Vercel first.',
    );
  }

  const sql = neon(databaseUrl);

  await verifyPublicFilters(sql);
  await verifyDuplicateSlug(sql);
  await verifyDuplicatePhotoOrder(sql);

  console.log(
    'Database verification passed: publication filters, photo visibility, cover ownership, unique slugs, and unique photo ordering.',
  );
}

verify().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
