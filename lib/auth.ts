import 'server-only';

import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import * as authSchema from '@/db/auth-schema';
import { db } from '@/db';

const SESSION_HOURS = 12;

export const auth = betterAuth({
  appName: 'Zoe Schmidt Studio',
  baseURL: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'zoe-schmidt.com',
      'www.zoe-schmidt.com',
      '*.vercel.app',
    ],
    fallback: 'http://localhost:3000',
    protocol: 'auto',
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: false,
  },
  session: {
    expiresIn: 60 * 60 * SESSION_HOURS,
    updateAge: 60 * 60,
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 30,
    customRules: {
      '/sign-in/email': {
        window: 60,
        max: 5,
      },
    },
  },
  advanced: {
    cookiePrefix: 'zoe-studio',
    database: {
      joins: false,
    },
  },
  disabledPaths: [
    '/sign-up/email',
    '/request-password-reset',
    '/reset-password',
    '/change-email',
    '/delete-user',
  ],
  plugins: [nextCookies()],
});
