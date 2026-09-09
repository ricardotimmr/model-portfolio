import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VARIABLE_NAME = 'BETTER_AUTH_SECRET';
const environments = ['production', 'preview', 'development'] as const;

function updateLocalEnvironment(secret: string) {
  const path = resolve(process.cwd(), '.env.local');
  const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const line = `${VARIABLE_NAME}=${secret}`;
  const pattern = new RegExp(`^${VARIABLE_NAME}=.*$`, 'm');
  const next = pattern.test(current)
    ? current.replace(pattern, line)
    : `${current.trimEnd()}${current ? '\n' : ''}${line}\n`;

  writeFileSync(path, next, { encoding: 'utf8', mode: 0o600 });
}

function setupSecret() {
  const localPath = resolve(process.cwd(), '.env.local');
  const localEnvironment = existsSync(localPath)
    ? readFileSync(localPath, 'utf8')
    : '';

  if (new RegExp(`^${VARIABLE_NAME}=.+$`, 'm').test(localEnvironment)) {
    throw new Error(
      `${VARIABLE_NAME} already exists locally. Refusing to rotate a live signing secret.`,
    );
  }

  const secret = randomBytes(48).toString('base64url');

  for (const environment of environments) {
    const result = spawnSync(
      'npx',
      [
        'vercel',
        'env',
        'add',
        VARIABLE_NAME,
        environment,
        '--sensitive',
        '--force',
        '--yes',
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        input: `${secret}\n`,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

    if (result.status !== 0) {
      const detail = result.stderr.trim() || result.stdout.trim();
      throw new Error(
        `Could not configure ${VARIABLE_NAME} for ${environment}.${detail ? ` ${detail}` : ''}`,
      );
    }
  }

  updateLocalEnvironment(secret);
  console.log(
    `${VARIABLE_NAME} is configured locally and for Vercel Production, Preview and Development.`,
  );
}

try {
  setupSecret();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
