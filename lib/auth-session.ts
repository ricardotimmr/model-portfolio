import 'server-only';

import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from './auth';

export class StudioUnauthorizedError extends Error {
  constructor() {
    super('Studio authentication is required.');
    this.name = 'StudioUnauthorizedError';
  }
}

export const getStudioSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireStudioAdmin() {
  const session = await getStudioSession();
  if (!session) throw new StudioUnauthorizedError();
  return session;
}

export async function requireStudioPage() {
  const session = await getStudioSession();
  if (!session) redirect('/studio/login');
  return session;
}
