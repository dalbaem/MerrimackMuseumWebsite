'use client';

import type { ReactNode } from 'react';
import IllustratedState from '@/components/IllustratedState';
import { useUser } from '../AppStateProvider';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAdmin, permissionsResolved } = useUser();

  if (!permissionsResolved) {
    return (
      <IllustratedState
        title="Checking access..."
        description="Verifying your dashboard permissions."
        showIllustration={false}
      />
    );
  }

  if (!isAdmin) {
    return (
      <IllustratedState
        title="Admin access required"
        description="This dashboard is reserved for collection administrators."
      />
    );
  }

  return <>{children}</>;
}
