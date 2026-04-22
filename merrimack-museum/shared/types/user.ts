export const APP_ROLES = ["admin", "faculty", "guest"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
