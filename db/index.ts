import 'server-only';

import { drizzle } from 'drizzle-orm/neon-http';
import * as authSchema from './auth-schema';
import * as contentSchema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'Missing DATABASE_URL. Pull the Vercel development environment before starting the application.',
  );
}

export const db = drizzle(databaseUrl, {
  schema: { ...contentSchema, ...authSchema },
});
