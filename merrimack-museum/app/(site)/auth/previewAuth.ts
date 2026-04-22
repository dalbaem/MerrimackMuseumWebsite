'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import {
  PREVIEW_ROLE_COOKIE_KEY,
  PREVIEW_ROLE_EVENT,
  PREVIEW_ROLE_STORAGE_KEY,
  canUsePreviewAuthForHostname,
  type PreviewRole,
} from '@/shared/previewAuth';

export type { PreviewRole } from '@/shared/previewAuth';

function canUsePreviewAuth() {
  if (typeof window === 'undefined') {
    return false;
  }

  return canUsePreviewAuthForHostname(window.location.hostname);
}

function readStoredPreviewRole(): PreviewRole | null {
  if (!canUsePreviewAuth()) {
    return null;
  }

  const value = window.localStorage.getItem(PREVIEW_ROLE_STORAGE_KEY);
  return value === 'guest' || value === 'faculty' || value === 'admin' ? value : null;
}

function syncPreviewRoleCookie(role: PreviewRole | null) {
  if (role && role !== 'guest') {
    document.cookie = `${PREVIEW_ROLE_COOKIE_KEY}=${role}; Path=/; SameSite=Lax`;
    return;
  }

  document.cookie = `${PREVIEW_ROLE_COOKIE_KEY}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

function buildPreviewSession(role: Exclude<PreviewRole, 'guest'>): Session {
  return {
    expires: '2099-01-01T00:00:00.000Z',
    user: {
      name: `Preview ${role === 'admin' ? 'Admin' : 'Faculty'}`,
      email: `${role}@preview.local`,
      image: null,
    },
  };
}

export function setStoredPreviewRole(role: PreviewRole | null) {
  if (!canUsePreviewAuth()) {
    return;
  }

  if (role) {
    window.localStorage.setItem(PREVIEW_ROLE_STORAGE_KEY, role);
  } else {
    window.localStorage.removeItem(PREVIEW_ROLE_STORAGE_KEY);
  }

  syncPreviewRoleCookie(role);

  window.dispatchEvent(new Event(PREVIEW_ROLE_EVENT));
}

export function usePreviewAuth() {
  const { data: session, status } = useSession();
  const [previewRole, setPreviewRoleState] = useState<PreviewRole | null>(null);
  const [previewEnabled, setPreviewEnabled] = useState(false);

  useEffect(() => {
    setPreviewEnabled(canUsePreviewAuth());
  }, []);

  useEffect(() => {
    if (!previewEnabled) {
      return;
    }

    const syncPreviewRole = () => {
      const role = readStoredPreviewRole();
      syncPreviewRoleCookie(role);
      setPreviewRoleState(role);
    };

    syncPreviewRole();
    window.addEventListener('storage', syncPreviewRole);
    window.addEventListener(PREVIEW_ROLE_EVENT, syncPreviewRole);

    return () => {
      window.removeEventListener('storage', syncPreviewRole);
      window.removeEventListener(PREVIEW_ROLE_EVENT, syncPreviewRole);
    };
  }, [previewEnabled]);

  const previewSession = useMemo(() => {
    if (previewRole === 'admin' || previewRole === 'faculty') {
      return buildPreviewSession(previewRole);
    }

    return null;
  }, [previewRole]);

  return {
    data: previewRole ? previewSession : session,
    status: previewRole ? (previewRole === 'guest' ? 'unauthenticated' : 'authenticated') : status,
    previewEnabled,
    previewRole,
    isPreviewActive: previewRole !== null,
    setPreviewRole: (role: PreviewRole | null) => setStoredPreviewRole(role),
  };
}
