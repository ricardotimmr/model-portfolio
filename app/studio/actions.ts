'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { requireStudioAdmin } from '@/lib/auth-session';

export async function signOutOfStudio() {
  await requireStudioAdmin();
  await auth.api.signOut({ headers: await headers() });
  redirect('/studio/login');
}
