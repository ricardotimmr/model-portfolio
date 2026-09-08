import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'Missing DATABASE_URL. Run `vercel env pull .env.local --environment=development` first.',
  );
}

const sql = neon(databaseUrl);
const [connection] = await sql`
  select
    current_database() as database_name,
    current_user as database_user,
    current_setting('server_version') as server_version
`;

console.log(
  `Connected to ${connection.database_name} as ${connection.database_user} (Postgres ${connection.server_version}).`,
);
