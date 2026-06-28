import { db, type DatabaseExecutor } from "@/server/db/client";
import { mapRoleToStoredUserType } from "@/server/db/legacy/transforms";
import { AppError } from "@/server/errors";
import type { UserRecord } from "@/server/users/types";
import {
  countMoveRequestsForUserId,
  createUser,
  deleteUserByEmail,
  ensureStoredUserTypeId,
  findUserByEmail,
  searchUsers as searchUserRecords,
  updateStoredUserTypeIdByEmail,
} from "@/server/users/repository";
import {
  normalizeEmail,
  type AppRole,
} from "@/shared/types/user";

function buildGuestAccess(email: string): UserRecord {
  const normalizedEmail = normalizeEmail(email);

  return {
    id: 0,
    email: normalizedEmail,
    role: "guest",
  };
}

export async function getUserAccess(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await findUserByEmail(normalizedEmail);

  return existingUser ?? buildGuestAccess(normalizedEmail);
}

export async function getRoleForEmail(email: string) {
  const user = await findUserByEmail(email);
  return user ? user.role : "guest";
}

export async function searchUsers(options: {
  email?: string;
  role?: AppRole;
}) {
  return searchUserRecords(options);
}

async function savePrivilegedUser(
  email: string,
  role: Exclude<AppRole, "guest">,
  executor: DatabaseExecutor = db,
) {
  const normalizedEmail = normalizeEmail(email);
  const storedUserType = mapRoleToStoredUserType(role);

  if (!storedUserType) {
    throw new AppError(400, `Role '${role}' cannot be stored in the user_type table.`);
  }

  const persistUser = async (trx: DatabaseExecutor) => {
    const existingUser = await findUserByEmail(normalizedEmail, trx);
    const storedUserTypeId = await ensureStoredUserTypeId(storedUserType, trx);

    if (!existingUser) {
      const createdUser = await createUser(normalizedEmail, storedUserTypeId, trx);

      if (!createdUser) {
        throw new AppError(500, "Unable to create user");
      }

      return createdUser;
    }

    const updatedUser = await updateStoredUserTypeIdByEmail(
      normalizedEmail,
      storedUserTypeId,
      trx,
    );

    if (!updatedUser) {
      throw new AppError(500, "Unable to update user role");
    }

    return updatedUser;
  };

  if (executor === db) {
    return db.transaction().execute(persistUser);
  }

  return persistUser(executor);
}

export async function ensurePrivilegedUser(
  email: string,
  role: Exclude<AppRole, "guest">,
  executor: DatabaseExecutor = db,
) {
  return savePrivilegedUser(email, role, executor);
}

async function saveGuestUser(email: string) {
  const normalizedEmail = normalizeEmail(email);

  return db.transaction().execute(async (trx) => {
    const existingUser = await findUserByEmail(normalizedEmail, trx);
    if (!existingUser) {
      const createdUser = await createUser(normalizedEmail, null, trx);

      if (!createdUser) {
        throw new AppError(500, "Unable to create user");
      }

      return createdUser;
    }

    const updatedUser = await updateStoredUserTypeIdByEmail(
      normalizedEmail,
      null,
      trx,
    );

    if (!updatedUser) {
      throw new AppError(500, "Unable to downgrade user role");
    }

    return updatedUser;
  });
}

export async function updateUserRole(email: string, role: AppRole) {
  if (role === "guest") {
    return saveGuestUser(email);
  }

  return savePrivilegedUser(email, role);
}

export async function deleteUser(email: string) {
  const normalizedEmail = normalizeEmail(email);

  await db.transaction().execute(async (trx) => {
    const existingUser = await findUserByEmail(normalizedEmail, trx);

    if (!existingUser) {
      throw new AppError(404, "User not found");
    }

    const requestCount = await countMoveRequestsForUserId(existingUser.id, trx);

    if (requestCount > 0) {
      throw new AppError(
        409,
        "This user has move request history and cannot be deleted. Change their privilege to Guest instead.",
      );
    }

    await deleteUserByEmail(normalizedEmail, trx);
  });
}
