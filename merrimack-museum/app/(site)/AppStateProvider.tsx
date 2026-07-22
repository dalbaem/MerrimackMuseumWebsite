'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { fetchUserAccess } from '@/lib/api/users';

interface AppStateProviderProps {
  children: ReactNode;
}

interface UserContextValue {
  email: string;
  isAdmin: boolean;
  isFaculty: boolean;
  permissionsResolved: boolean;
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

export default function AppStateProvider({ children }: AppStateProviderProps) {
  const { data: session, status } = useSession();
  const email = session?.user?.email?.trim() ?? '';
  const [permissionState, setPermissionState] = useState(INITIAL_PERMISSION_STATE);

  useEffect(() => {
    let ignore = false;

    async function loadPermissions() {
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
  }, [email, status]);

  const contextValue = useMemo(
    () => ({
      email,
      isAdmin: permissionState.isAdmin,
      isFaculty: permissionState.isFaculty,
      permissionsResolved: permissionState.permissionsResolved,
    }),
    [
      email,
      permissionState.isAdmin,
      permissionState.isFaculty,
      permissionState.permissionsResolved,
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
