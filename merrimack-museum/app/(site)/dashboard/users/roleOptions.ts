import type { AppRole } from '@/shared/types/user';

export const USER_ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin' },
  { label: 'Faculty/Staff', value: 'faculty' },
  { label: 'Guest', value: 'guest' },
] as const satisfies ReadonlyArray<{ label: string; value: AppRole }>;

export type UserRoleOption = (typeof USER_ROLE_OPTIONS)[number];

export function getRoleLabel(role: AppRole) {
  return USER_ROLE_OPTIONS.find((item) => item.value === role)?.label ?? 'Guest';
}
