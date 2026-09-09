import type { ReactNode } from 'react';
import { requireStudioPage } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function ProtectedStudioLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireStudioPage();
  return children;
}
