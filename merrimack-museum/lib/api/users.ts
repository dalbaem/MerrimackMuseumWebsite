import { requestJson } from "@/lib/api/http";
import type { UserDto, UserRoleDto } from "@/shared/types/api";
import { normalizeEmail, type AppRole } from "@/shared/types/user";

export async function fetchUserAccess(email: string) {
  return requestJson<UserDto>("/api/user", {
    method: "POST",
    body: JSON.stringify({
      email: normalizeEmail(email),
    }),
  });
}

export async function updateUserRole(email: string, role: AppRole) {
  return requestJson<UserRoleDto>("/api/users/role", {
    method: "PUT",
    body: JSON.stringify({
      email: normalizeEmail(email),
      role,
    }),
  });
}
