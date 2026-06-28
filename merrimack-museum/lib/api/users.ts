import { requestJson } from "@/lib/api/http";
import type { UserDto, UserRoleDto } from "@/shared/types/api";
import { normalizeEmail, type AppRole } from "@/shared/types/user";

interface UserSearchParams {
  email?: string;
  role?: AppRole;
}

export async function fetchUserAccess(email: string) {
  return requestJson<UserDto>("/api/user", {
    method: "POST",
    body: JSON.stringify({
      email: normalizeEmail(email),
    }),
  });
}

export async function searchUsers({ email, role }: UserSearchParams = {}) {
  const searchParams = new URLSearchParams();
  const normalizedEmail = normalizeEmail(email ?? "");

  if (normalizedEmail) {
    searchParams.set("email", normalizedEmail);
  }

  if (role) {
    searchParams.set("role", role);
  }

  const queryString = searchParams.toString();

  return requestJson<UserDto[]>(
    queryString ? `/api/users?${queryString}` : "/api/users",
  );
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

export async function deleteUser(email: string) {
  return requestJson<void>(
    `/api/users/${encodeURIComponent(normalizeEmail(email))}`,
    {
      method: "DELETE",
    },
  );
}
