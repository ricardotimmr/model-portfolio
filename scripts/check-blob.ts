import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { listBlobAssets } from '../lib/blob-core';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is missing.');

const assets = await listBlobAssets('shootings/');
const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
const sql = neon(databaseUrl);
const rows = (await sql`
  select
    id,
    url,
    storage_path,
    content_type,
    file_size,
    blob_etag,
    uploaded_at
  from photos
  order by storage_path nulls first, id
`) as Array<{
  id: string;
  url: string;
  storage_path: string | null;
  content_type: string | null;
  file_size: number | null;
  blob_etag: string | null;
  uploaded_at: Date | null;
}>;

const assetsByPath = new Map(assets.map((asset) => [asset.pathname, asset]));
const databasePaths = new Set<string>();
const problems: string[] = [];

for (const row of rows) {
  if (
    !row.storage_path ||
    !row.content_type ||
    !row.file_size ||
    !row.blob_etag ||
    !row.uploaded_at
  ) {
    problems.push(`Photo ${row.id} has incomplete Blob metadata.`);
    continue;
  }

  databasePaths.add(row.storage_path);
  const asset = assetsByPath.get(row.storage_path);
  if (!asset) {
    problems.push(`Photo ${row.id} references a missing Blob asset.`);
    continue;
  }

  if (row.url !== asset.url) {
    problems.push(`Photo ${row.id} has a different Blob URL.`);
  }
  if (row.file_size !== asset.size) {
    problems.push(`Photo ${row.id} has a different Blob size.`);
  }
  if (row.blob_etag !== asset.etag) {
    problems.push(`Photo ${row.id} has a different Blob ETag.`);
  }
}

for (const asset of assets) {
  if (!databasePaths.has(asset.pathname)) {
    problems.push(`Blob ${asset.pathname} has no Photo row.`);
  }
}

if (rows.length !== assets.length) {
  problems.push(
    `Count mismatch: ${rows.length} Photo rows and ${assets.length} Blob assets.`,
  );
}

if (problems.length) {
  throw new Error(`Blob verification failed:\n- ${problems.join('\n- ')}`);
}

console.log(
  `Blob verification passed: ${assets.length} Photo rows match ${assets.length} shooting assets (${totalSize} bytes).`,
);
