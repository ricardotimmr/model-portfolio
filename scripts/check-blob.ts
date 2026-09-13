import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { getBlobMetadata, listBlobAssets } from '../lib/blob-core';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is missing.');

const [assets, siteAssets] = await Promise.all([
  listBlobAssets('shootings/'),
  listBlobAssets('site/profile/'),
]);
const totalSize = [...assets, ...siteAssets].reduce(
  (sum, asset) => sum + asset.size,
  0,
);
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

const [settings] = (await sql`
  select
    portrait_url,
    portrait_storage_path,
    portrait_content_type,
    portrait_file_size,
    portrait_blob_etag,
    comp_card_url,
    comp_card_storage_path,
    comp_card_content_type,
    comp_card_file_size,
    comp_card_blob_etag
  from site_settings
  where id = 'primary'
`) as Array<{
  portrait_url: string;
  portrait_storage_path: string | null;
  portrait_content_type: string | null;
  portrait_file_size: number | null;
  portrait_blob_etag: string | null;
  comp_card_url: string | null;
  comp_card_storage_path: string | null;
  comp_card_content_type: string | null;
  comp_card_file_size: number | null;
  comp_card_blob_etag: string | null;
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

const siteAssetsByPath = new Map(
  siteAssets.map((asset) => [asset.pathname, asset]),
);
const referencedSitePaths = new Set<string>();

for (const item of [
  settings
    ? {
        label: 'Profile portrait',
        url: settings.portrait_url,
        path: settings.portrait_storage_path,
        type: settings.portrait_content_type,
        size: settings.portrait_file_size,
        etag: settings.portrait_blob_etag,
      }
    : null,
  settings?.comp_card_url
    ? {
        label: 'Comp Card',
        url: settings.comp_card_url,
        path: settings.comp_card_storage_path,
        type: settings.comp_card_content_type,
        size: settings.comp_card_file_size,
        etag: settings.comp_card_blob_etag,
      }
    : null,
].filter((item) => item?.path?.startsWith('site/profile/'))) {
  if (!item?.path) continue;
  referencedSitePaths.add(item.path);
  const asset = siteAssetsByPath.get(item.path);
  if (!asset) {
    problems.push(`${item.label} references a missing site Blob asset.`);
    continue;
  }
  const metadata = await getBlobMetadata(item.url);
  if (
    item.url !== asset.url ||
    item.size !== asset.size ||
    item.etag !== asset.etag ||
    item.type !== metadata?.contentType
  ) {
    problems.push(`${item.label} has mismatched site Blob metadata.`);
  }
}

for (const asset of siteAssets) {
  if (!referencedSitePaths.has(asset.pathname)) {
    problems.push(`Site Blob ${asset.pathname} is not referenced by settings.`);
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
  `Blob verification passed: ${assets.length} Photo rows match ${assets.length} shooting assets and ${siteAssets.length} owned site assets (${totalSize} bytes total).`,
);
