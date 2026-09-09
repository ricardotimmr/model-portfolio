import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { validateAdminEmail } from '../lib/admin-email';

const { loadEnvConfig } = nextEnv;

function readEmailArgument() {
  const inline = process.argv.find((argument) =>
    argument.startsWith('--email='),
  );
  if (inline) return inline.slice('--email='.length);

  const index = process.argv.indexOf('--email');
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function updateEmail() {
  loadEnvConfig(process.cwd());

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing from the local environment.');
  }

  const rawEmail = readEmailArgument();
  if (!rawEmail) {
    throw new Error(
      'Pass the new address with --email, for example: npm run auth:update-email -- --email you@example.com',
    );
  }

  const email = validateAdminEmail(rawEmail);
  const sql = neon(databaseUrl);
  const administrators = await sql`
    select id, email
    from auth_users
    order by created_at asc
  `;

  if (administrators.length !== 1) {
    throw new Error(
      `Expected exactly one Studio administrator, found ${administrators.length}. No changes were made.`,
    );
  }

  const administrator = administrators[0]!;
  if (administrator.email === email) {
    console.log(`The Studio email is already ${email}.`);
    return;
  }

  await sql.transaction((transaction) => [
    transaction`
      update auth_users
      set email = ${email}, updated_at = now()
      where id = ${administrator.id}
    `,
    transaction`
      delete from auth_sessions
      where user_id = ${administrator.id}
    `,
  ]);

  console.log(
    `Studio email changed to ${email}. Existing Studio sessions were revoked.`,
  );
}

updateEmail().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
