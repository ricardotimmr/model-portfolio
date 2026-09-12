import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is missing.');

type ImageAssetRow = {
  shooting_slug: string;
  original_filename: string | null;
  content_type: string | null;
  file_size: number | null;
  width: number;
  height: number;
  blob_etag: string | null;
};

const sql = neon(databaseUrl);
const rows = (await sql`
  select
    shootings.slug as shooting_slug,
    photos.original_filename,
    photos.content_type,
    photos.file_size,
    photos.width,
    photos.height,
    photos.blob_etag
  from photos
  inner join shootings on shootings.id = photos.shooting_id
  order by shootings.slug, photos.sort_order
`) as ImageAssetRow[];

if (rows.length === 0) {
  console.log('No image assets found.');
  process.exit(0);
}

function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1),
  );
  return sorted[index] ?? 0;
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatMegapixels(pixels: number) {
  return `${(pixels / 1_000_000).toFixed(1)} MP`;
}

const sizes = rows.map((row) => row.file_size ?? 0);
const pixels = rows.map((row) => row.width * row.height);
const totalBytes = sizes.reduce((sum, value) => sum + value, 0);
const formats = new Map<string, number>();
const etags = new Map<string, number>();
const orientations = new Map<string, number>();

for (const row of rows) {
  const format = row.content_type ?? 'unknown';
  formats.set(format, (formats.get(format) ?? 0) + 1);
  const orientation =
    row.width > row.height
      ? 'landscape'
      : row.width < row.height
        ? 'portrait'
        : 'square';
  orientations.set(orientation, (orientations.get(orientation) ?? 0) + 1);
  if (row.blob_etag)
    etags.set(row.blob_etag, (etags.get(row.blob_etag) ?? 0) + 1);
}

const largestByBytes = [...rows]
  .sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0))
  .slice(0, 5);
const largestByPixels = [...rows]
  .sort((a, b) => b.width * b.height - a.width * a.height)
  .slice(0, 5);
const duplicateEtags = [...etags.values()].filter((count) => count > 1).length;

console.log('Public image asset inventory');
console.log(`- Assets: ${rows.length}`);
console.log(`- Total source bytes: ${formatBytes(totalBytes)}`);
console.log(`- Mean source size: ${formatBytes(totalBytes / rows.length)}`);
console.log(`- Median source size: ${formatBytes(percentile(sizes, 0.5))}`);
console.log(`- P75 source size: ${formatBytes(percentile(sizes, 0.75))}`);
console.log(`- P95 source size: ${formatBytes(percentile(sizes, 0.95))}`);
console.log(`- Maximum source size: ${formatBytes(Math.max(...sizes))}`);
console.log(
  `- Median resolution: ${formatMegapixels(percentile(pixels, 0.5))}`,
);
console.log(`- P95 resolution: ${formatMegapixels(percentile(pixels, 0.95))}`);
console.log(`- Maximum resolution: ${formatMegapixels(Math.max(...pixels))}`);
console.log(
  `- Formats: ${[...formats.entries()].map(([format, count]) => `${format} (${count})`).join(', ')}`,
);
console.log(`- Duplicate ETag candidates: ${duplicateEtags}`);
console.log(
  `- Orientations: ${[...orientations.entries()].map(([orientation, count]) => `${orientation} (${count})`).join(', ')}`,
);
console.log(
  `- Aspect-ratio range: ${Math.min(...rows.map((row) => row.width / row.height)).toFixed(3)}–${Math.max(...rows.map((row) => row.width / row.height)).toFixed(3)}`,
);
console.log(
  `- Long edge at least 4320 px (1440 CSS px at DPR 3): ${rows.filter((row) => Math.max(row.width, row.height) >= 4320).length}/${rows.length}`,
);
console.log(
  `- Complete stored byte/type/ETag metadata: ${rows.filter((row) => row.file_size && row.content_type && row.blob_etag).length}/${rows.length}`,
);

console.log('\nLargest files');
for (const row of largestByBytes) {
  console.log(
    `- ${row.shooting_slug}/${row.original_filename ?? 'unnamed'}: ${formatBytes(row.file_size ?? 0)}, ${row.width}×${row.height}`,
  );
}

console.log('\nLargest resolutions');
for (const row of largestByPixels) {
  console.log(
    `- ${row.shooting_slug}/${row.original_filename ?? 'unnamed'}: ${row.width}×${row.height} (${formatMegapixels(row.width * row.height)}), ${formatBytes(row.file_size ?? 0)}`,
  );
}
