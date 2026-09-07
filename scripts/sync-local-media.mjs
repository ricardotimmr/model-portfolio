import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const contentRoot = join(projectRoot, 'content-preparation');
const mediaRoot = join(projectRoot, 'public', 'media');

const directories = [
  ['shootings/01-studio-portraits/images', 'shootings/01-studio-portraits'],
  ['shootings/02-summer-afternoon/images', 'shootings/02-summer-afternoon'],
  ['shootings/03-mountain-light/images', 'shootings/03-mountain-light'],
];

if (!existsSync(contentRoot)) {
  throw new Error('Local content-preparation directory is missing.');
}

for (const [source, destination] of directories) {
  const sourcePath = join(contentRoot, source);
  if (!existsSync(sourcePath))
    throw new Error(`Missing local media source: ${source}`);
  const destinationPath = join(mediaRoot, destination);
  mkdirSync(destinationPath, { recursive: true });

  for (const filename of readdirSync(sourcePath)) {
    if (!/\.(avif|jpe?g|png|webp)$/i.test(filename)) continue;
    cpSync(join(sourcePath, filename), join(destinationPath, filename));
  }
}

const portraitSource = join(
  contentRoot,
  'profile',
  'portrait',
  'studio-portraits-08.jpg',
);
const portraitDestination = join(
  mediaRoot,
  'profile',
  'studio-portraits-08.jpg',
);
mkdirSync(dirname(portraitDestination), { recursive: true });
cpSync(portraitSource, portraitDestination);

console.log('Local portfolio media synchronized.');
