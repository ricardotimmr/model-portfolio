import { randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { hashPassword } from 'better-auth/crypto';
import { validateAdminEmail } from '../lib/admin-email';

const { loadEnvConfig } = nextEnv;

function readArgument(name: string) {
  const inline = process.argv.find((argument) =>
    argument.startsWith(`--${name}=`),
  );
  if (inline) return inline.slice(name.length + 3);

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readHiddenLine(prompt: string) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Run this command in an interactive terminal.');
  }

  return new Promise<string>((resolve, reject) => {
    let value = '';
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      process.stdout.write('\n');
    };

    const onData = (character: string) => {
      if (character === '\u0003') {
        finish();
        reject(new Error('Cancelled.'));
        return;
      }

      if (character === '\r' || character === '\n') {
        finish();
        resolve(value);
        return;
      }

      if (character === '\u007f' || character === '\b') {
        value = value.slice(0, -1);
        return;
      }

      if (character >= ' ') value += character;
    };

    process.stdin.on('data', onData);
  });
}

async function createAdmin() {
  loadEnvConfig(process.cwd());

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing from the local environment.');
  }

  const rawEmail = readArgument('email');
  if (!rawEmail) {
    throw new Error(
      'Pass the admin email with --email, for example: npm run auth:create-admin -- --email you@example.com',
    );
  }

  const email = validateAdminEmail(rawEmail);
  const password = await readHiddenLine('New Studio password: ');
  const confirmation = await readHiddenLine('Confirm Studio password: ');

  if (password !== confirmation) throw new Error('Passwords do not match.');
  if (password.length < 12 || password.length > 128) {
    throw new Error('The password must contain between 12 and 128 characters.');
  }

  const sql = neon(databaseUrl);
  const [existing] = await sql`
    select count(*)::int as count
    from auth_users
  `;

  if ((existing?.count ?? 0) !== 0) {
    throw new Error(
      'A Studio administrator already exists. No account was created.',
    );
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(password);

  await sql.transaction((transaction) => [
    transaction`
      insert into auth_users (
        id, name, email, email_verified, created_at, updated_at
      ) values (
        ${userId}, 'Portfolio Admin', ${email}, false, now(), now()
      )
    `,
    transaction`
      insert into auth_accounts (
        id, account_id, provider_id, user_id, password, created_at, updated_at
      ) values (
        ${randomUUID()}, ${userId}, 'credential', ${userId},
        ${passwordHash}, now(), now()
      )
    `,
  ]);

  console.log(`Studio administrator created for ${email}.`);
}

createAdmin().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
