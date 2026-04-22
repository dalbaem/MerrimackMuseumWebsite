'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { fetchUserAccess } from '@/lib/api/users';
import type { PreviewRole } from './auth/previewAuth';
import { usePreviewAuth } from './auth/previewAuth';

interface AppStateProviderProps {
  children: ReactNode;
}

interface UserContextValue {
  email: string;
  isAdmin: boolean;
  isFaculty: boolean;
  isPreviewActive: boolean;
  permissionsResolved: boolean;
  previewEnabled: boolean;
  previewRole: PreviewRole | null;
  setPreviewRole: (role: PreviewRole | null) => void;
}

interface PermissionState {
  isAdmin: boolean;
  isFaculty: boolean;
  permissionsResolved: boolean;
}

const INITIAL_PERMISSION_STATE: PermissionState = {
  isAdmin: false,
  isFaculty: false,
  permissionsResolved: false,
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

function getPreviewPermissionState(role: PreviewRole): PermissionState {
  return {
    isAdmin: role === 'admin',
    isFaculty: role === 'admin' || role === 'faculty',
    permissionsResolved: true,
  };
}

export default function AppStateProvider({ children }: AppStateProviderProps) {
  const { data: session, status, ...previewAuth } = usePreviewAuth();
  const email = session?.user?.email?.trim() ?? '';
  const [permissionState, setPermissionState] = useState(INITIAL_PERMISSION_STATE);

  useEffect(() => {
    let ignore = false;

    async function loadPermissions() {
      if (previewAuth.previewRole) {
        setPermissionState(getPreviewPermissionState(previewAuth.previewRole));
        return;
      }

      if (status === 'loading') {
        setPermissionState(INITIAL_PERMISSION_STATE);
        return;
      }

      if (!email) {
        setPermissionState({
          isAdmin: false,
          isFaculty: false,
          permissionsResolved: true,
        });
        return;
      }

      setPermissionState(INITIAL_PERMISSION_STATE);

      try {
        const data = await fetchUserAccess(email);
        if (ignore) {
          return;
        }

        setPermissionState({
          isAdmin: data.role === 'admin',
          isFaculty: data.role === 'admin' || data.role === 'faculty',
          permissionsResolved: true,
        });
      } catch (error) {
        console.error('Error loading user permissions:', error);

        if (ignore) {
          return;
        }

        setPermissionState({
          isAdmin: false,
          isFaculty: false,
          permissionsResolved: true,
        });
      }
    }

    void loadPermissions();

    return () => {
      ignore = true;
    };
  }, [email, previewAuth.previewRole, status]);

  const contextValue = useMemo(
    () => ({
      email,
      isAdmin: permissionState.isAdmin,
      isFaculty: permissionState.isFaculty,
      isPreviewActive: previewAuth.isPreviewActive,
      permissionsResolved: permissionState.permissionsResolved,
      previewEnabled: previewAuth.previewEnabled,
      previewRole: previewAuth.previewRole,
      setPreviewRole: previewAuth.setPreviewRole,
    }),
    [
      email,
      permissionState.isAdmin,
      permissionState.isFaculty,
      permissionState.permissionsResolved,
      previewAuth.isPreviewActive,
      previewAuth.previewEnabled,
      previewAuth.previewRole,
      previewAuth.setPreviewRole,
    ],
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within AppStateProvider');
  }

  return context;
}
