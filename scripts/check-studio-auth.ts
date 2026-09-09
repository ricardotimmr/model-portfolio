import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';

const { loadEnvConfig } = nextEnv;

async function checkAuth() {
  loadEnvConfig(process.cwd());

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing from the local environment.');
  }

  const sql = neon(databaseUrl);
  const [status] = await sql`
    select
      (select count(*)::int from auth_users) as administrators,
      (select count(*)::int from auth_accounts where provider_id = 'credential') as credential_accounts,
      (select count(*)::int from auth_sessions where expires_at > now()) as active_sessions
  `;

  const administrators = status?.administrators ?? 0;
  const credentials = status?.credential_accounts ?? 0;

  if (administrators > 1 || credentials !== administrators) {
    throw new Error(
      `Invalid Studio auth state: ${administrators} administrators and ${credentials} credential accounts.`,
    );
  }

  console.log(
    `Studio auth check passed: ${administrators} administrator, ${status?.active_sessions ?? 0} active sessions.`,
  );
}

checkAuth().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
