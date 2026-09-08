import { readFile, readdir } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { getBlobMetadata, uploadPublicImage } from '../lib/blob-core';
import {
  createMigrationBlobPathname,
  inspectImageBuffer,
  type ImageMetadata,
} from '../lib/image-core';

const { loadEnvConfig } = nextEnv;
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const shootingsRoot = join(projectRoot, 'content-preparation', 'shootings');
const execute = process.argv.includes('--execute');

type PhotoAssetRow = {
  id: string;
  shooting_slug: string;
  url: string;
  storage_path: string | null;
  original_filename: string | null;
  width: number;
  height: number;
};

type PreparedAsset = {
  row: PhotoAssetRow;
  sourcePath: string;
  pathname: string;
  buffer: Buffer;
  metadata: ImageMetadata;
};

async function prepareInventory(rows: PhotoAssetRow[]) {
  const shootingDirectories = (
    await readdir(shootingsRoot, {
      withFileTypes: true,
    })
  ).filter((entry) => entry.isDirectory());

  const localFiles = (
    await Promise.all(
      shootingDirectories.map(async (directory) => {
        const imageDirectory = join(shootingsRoot, directory.name, 'images');
        const filenames = await readdir(imageDirectory);
        return filenames
          .filter((filename) => /\.(avif|jpe?g|png|webp)$/i.test(filename))
          .map((filename) => ({
            key: `${directory.name.replace(/^\d+-/, '')}/${filename}`,
            sourcePath: join(imageDirectory, filename),
          }));
      }),
    )
  ).flat();

  const localByKey = new Map(localFiles.map((file) => [file.key, file]));
  if (localByKey.size !== localFiles.length) {
    throw new Error('The local image inventory contains duplicate paths.');
  }

  const rowByKey = new Map(
    rows.map((row) => [
      `${row.shooting_slug}/${row.original_filename ?? ''}`,
      row,
    ]),
  );
  if (rowByKey.size !== rows.length) {
    throw new Error('The database image inventory contains duplicate paths.');
  }

  const missingInDatabase = localFiles.filter(({ key }) => !rowByKey.has(key));
  const missingLocally = rows.filter(
    (row) =>
      !localByKey.has(`${row.shooting_slug}/${row.original_filename ?? ''}`),
  );

  if (missingInDatabase.length || missingLocally.length) {
    throw new Error(
      [
        missingInDatabase.length
          ? `Local files without Photo rows: ${missingInDatabase.map(({ key }) => key).join(', ')}`
          : '',
        missingLocally.length
          ? `Photo rows without local files: ${missingLocally.map((row) => `${row.shooting_slug}/${row.original_filename ?? '(missing filename)'}`).join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  const prepared = await Promise.all(
    rows.map(async (row): Promise<PreparedAsset> => {
      const key = `${row.shooting_slug}/${row.original_filename}`;
      const source = localByKey.get(key)!;
      const buffer = await readFile(source.sourcePath);
      const metadata = await inspectImageBuffer(buffer);

      if (metadata.width !== row.width || metadata.height !== row.height) {
        throw new Error(
          `${key} dimensions differ: database ${row.width}x${row.height}, file ${metadata.width}x${metadata.height}.`,
        );
      }

      return {
        row,
        sourcePath: source.sourcePath,
        pathname: createMigrationBlobPathname(
          row.shooting_slug,
          row.id,
          metadata.extension,
        ),
        buffer,
        metadata,
      };
    }),
  );

  return prepared.sort((a, b) => a.pathname.localeCompare(b.pathname, 'en'));
}

async function migrate() {
  loadEnvConfig(projectRoot);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is missing. Pull the Vercel Development environment first.',
    );
  }

  const sql = neon(databaseUrl);
  const rows = (await sql`
    select
      p.id,
      s.slug as shooting_slug,
      p.url,
      p.storage_path,
      p.original_filename,
      p.width,
      p.height
    from photos p
    join shootings s on s.id = p.shooting_id
    order by s.slug, p.sort_order
  `) as PhotoAssetRow[];
  const assets = await prepareInventory(rows);

  console.log(
    `Preflight passed: ${assets.length} database rows match ${assets.length} local image files.`,
  );
  for (const asset of assets) {
    console.log(
      `${execute ? 'MIGRATE' : 'DRY RUN'} ${basename(asset.sourcePath)} -> ${asset.pathname} (${asset.metadata.width}x${asset.metadata.height}, ${asset.metadata.contentType}, ${asset.metadata.fileSize} bytes)`,
    );
  }

  if (!execute) {
    console.log();
    console.log(
      'Dry run only. Re-run with --execute after reviewing the inventory.',
    );
    return;
  }

  for (const [index, asset] of assets.entries()) {
    let blob = await getBlobMetadata(asset.pathname);

    if (!blob) {
      const uploaded = await uploadPublicImage({
        pathname: asset.pathname,
        buffer: asset.buffer,
        metadata: asset.metadata,
      });
      blob = await getBlobMetadata(uploaded.url);
    }

    if (!blob) {
      throw new Error(
        `Blob metadata is missing after upload: ${asset.pathname}`,
      );
    }

    await sql`
      update photos
      set
        url = ${blob.url},
        storage_path = ${blob.pathname},
        content_type = ${blob.contentType},
        file_size = ${blob.size},
        blob_etag = ${blob.etag},
        width = ${asset.metadata.width},
        height = ${asset.metadata.height},
        aspect_ratio = ${asset.metadata.aspectRatio},
        orientation = ${asset.metadata.orientation},
        uploaded_at = ${blob.uploadedAt},
        updated_at = now()
      where id = ${asset.row.id}
    `;

    console.log(`Completed ${index + 1}/${assets.length}: ${asset.pathname}`);
  }

  const [verification] = await sql`
    select
      count(*)::int as total,
      count(*) filter (
        where url like 'https://%'
          and storage_path is not null
          and content_type is not null
          and file_size is not null
          and blob_etag is not null
          and uploaded_at is not null
      )::int as complete,
      count(*) filter (where url like '/media/%')::int as local_urls
    from photos
  `;

  if (
    verification.complete !== verification.total ||
    verification.local_urls !== 0
  ) {
    throw new Error(
      `Migration verification failed: ${verification.complete}/${verification.total} complete, ${verification.local_urls} local URLs remain.`,
    );
  }

  console.log(
    `Blob migration complete: ${verification.complete}/${verification.total} Photo rows use remote assets.`,
  );
}

migrate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
