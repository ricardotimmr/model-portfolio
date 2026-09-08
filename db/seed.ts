import { createHash } from 'node:crypto';
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { seedShootings } from './seed-data';

const { loadEnvConfig } = nextEnv;

function stableUuid(value: string) {
  const bytes = createHash('sha256')
    .update(`model-portfolio:${value}`)
    .digest()
    .subarray(0, 16);

  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function seed() {
  loadEnvConfig(process.cwd());

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is missing. Pull the Development environment variables from Vercel first.',
    );
  }

  const sql = neon(databaseUrl);
  const shootingIds = new Map(
    seedShootings.map((shooting) => [
      shooting.slug,
      stableUuid(`shooting:${shooting.slug}`),
    ]),
  );
  const photoIds = new Map(
    seedShootings.flatMap((shooting) =>
      shooting.photos.map((photo) => [
        `${shooting.slug}:${photo.id}`,
        stableUuid(`photo:${shooting.slug}:${photo.id}`),
      ]),
    ),
  );

  await sql.transaction((transaction) => {
    const statements = [];

    for (const shooting of seedShootings) {
      const shootingId = shootingIds.get(shooting.slug)!;

      statements.push(transaction`
        insert into shootings (
          id, slug, title, description_en, description_de,
          location_en, location_de, shoot_date, year, photographer,
          styling, makeup, hair, client, credits, cover_photo_id,
          featured_on_index, index_order, status, published_at
        ) values (
          ${shootingId}, ${shooting.slug}, ${shooting.title},
          ${shooting.description?.en ?? null}, ${shooting.description?.de ?? null},
          ${shooting.location?.en ?? null}, ${shooting.location?.de ?? null},
          ${shooting.shootDate ?? null}, ${shooting.year},
          ${shooting.photographer ?? null}, ${shooting.styling ?? null},
          ${shooting.makeup ?? null}, ${shooting.hair ?? null},
          ${shooting.client ?? null}, ${shooting.credits ?? null}, null,
          ${shooting.featuredOnIndex}, ${shooting.indexOrder},
          'published', now()
        )
        on conflict (slug) do update set
          title = excluded.title,
          description_en = excluded.description_en,
          description_de = excluded.description_de,
          location_en = excluded.location_en,
          location_de = excluded.location_de,
          shoot_date = excluded.shoot_date,
          year = excluded.year,
          photographer = excluded.photographer,
          styling = excluded.styling,
          makeup = excluded.makeup,
          hair = excluded.hair,
          client = excluded.client,
          credits = excluded.credits,
          featured_on_index = excluded.featured_on_index,
          index_order = excluded.index_order,
          status = excluded.status,
          published_at = coalesce(shootings.published_at, excluded.published_at),
          updated_at = now()
      `);

      for (const [sortOrder, photo] of shooting.photos.entries()) {
        const photoId = photoIds.get(`${shooting.slug}:${photo.id}`)!;
        const originalFilename = photo.src.split('/').at(-1) ?? null;

        statements.push(transaction`
          insert into photos (
            id, shooting_id, url, storage_path, original_filename,
            width, height, aspect_ratio, orientation,
            alt_en, alt_de, caption_en, caption_de, sort_order,
            archive_visible, shooting_visible, layout_hint
          ) values (
            ${photoId}, ${shootingId}, ${photo.src}, null, ${originalFilename},
            ${photo.width}, ${photo.height}, ${photo.width / photo.height},
            ${photo.orientation}, ${photo.alt.en}, ${photo.alt.de},
            ${photo.caption?.en ?? null}, ${photo.caption?.de ?? null},
            ${sortOrder}, ${photo.archiveVisible}, ${photo.shootingVisible}, 'auto'
          )
          on conflict (id) do update set
            shooting_id = excluded.shooting_id,
            url = case
              when photos.storage_path is not null then photos.url
              else excluded.url
            end,
            original_filename = excluded.original_filename,
            width = excluded.width,
            height = excluded.height,
            aspect_ratio = excluded.aspect_ratio,
            orientation = excluded.orientation,
            alt_en = excluded.alt_en,
            alt_de = excluded.alt_de,
            caption_en = excluded.caption_en,
            caption_de = excluded.caption_de,
            sort_order = excluded.sort_order,
            archive_visible = excluded.archive_visible,
            shooting_visible = excluded.shooting_visible,
            layout_hint = excluded.layout_hint,
            updated_at = now()
        `);
      }
    }

    for (const shooting of seedShootings) {
      const shootingId = shootingIds.get(shooting.slug)!;
      const coverPhotoId = photoIds.get(
        `${shooting.slug}:${shooting.coverPhotoId}`,
      );

      if (!coverPhotoId) {
        throw new Error(
          `Cover photo ${shooting.coverPhotoId} is missing from ${shooting.slug}.`,
        );
      }

      statements.push(transaction`
        update shootings
        set cover_photo_id = ${coverPhotoId}, updated_at = now()
        where id = ${shootingId}
      `);
    }

    return statements;
  });

  const [counts] = await sql`
    select
      (select count(*)::int from shootings) as shootings,
      (select count(*)::int from photos) as photos
  `;

  console.log(
    `Seed complete: ${counts?.shootings ?? 0} shootings and ${counts?.photos ?? 0} photos in the database.`,
  );
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
