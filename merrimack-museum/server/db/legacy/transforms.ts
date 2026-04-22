import type { AppRole } from "@/shared/types/user";

const ROLE_BY_STORED_USER_TYPE: Record<string, AppRole> = {
  Admin: "admin",
  FS: "faculty",
};

const STORED_USER_TYPE_BY_ROLE = {
  admin: "Admin",
  faculty: "FS",
} satisfies Record<Exclude<AppRole, "guest">, string>;

export function normalizeStoredText(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  return value.trim();
}

export function mapStoredUserTypeToRole(
  userType: string | null | undefined,
): AppRole {
  const normalizedUserType = normalizeStoredText(userType);

  if (!normalizedUserType) {
    return "guest";
  }

  return ROLE_BY_STORED_USER_TYPE[normalizedUserType] ?? "guest";
}

export function mapRoleToStoredUserType(role: AppRole) {
  if (role === "guest") {
    return null;
  }

  return STORED_USER_TYPE_BY_ROLE[role];
}
