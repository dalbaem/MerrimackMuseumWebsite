'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import AppStateProvider from './AppStateProvider';

interface SiteProvidersProps {
  children: ReactNode;
}

export default function SiteProviders({ children }: SiteProvidersProps) {
  return (
    <SessionProvider>
      <AppStateProvider>{children}</AppStateProvider>
    </SessionProvider>
  );
}
