import { sql } from "kysely";
import { db, type DatabaseExecutor } from "@/server/db/client";
import {
  mapStoredUserTypeToRole,
  normalizeStoredText,
} from "@/server/db/legacy/transforms";
import type { UserRecord } from "@/server/users/types";
import {
  normalizeEmail,
} from "@/shared/types/user";

interface UserRow {
  id: number;
  email: string | null;
  userType: string | null;
}

function baseUserQuery(executor: DatabaseExecutor = db) {
  return executor
    .selectFrom("user as users")
    .leftJoin("user_type as roles", "roles.iduser_type", "users.user_type_id");
}

function mapUserRow(row: UserRow): UserRecord {
  const email = normalizeStoredText(row.email) || "";
  const storedUserType = normalizeStoredText(row.userType);

  return {
    id: row.id,
    email,
    role: mapStoredUserTypeToRole(storedUserType),
  };
}

function userSelectQuery(executor: DatabaseExecutor = db) {
  return baseUserQuery(executor).select([
    "users.iduser as id",
    "users.address as email",
    "roles.user_type as userType",
  ]);
}

export async function findUserByEmail(
  email: string,
  executor: DatabaseExecutor = db,
) {
  const normalizedEmail = normalizeEmail(email);

  const row = await userSelectQuery(executor)
    .where(sql<boolean>`lower(${sql.ref("users.address")}) = ${normalizedEmail}`)
    .executeTakeFirst();

  return row ? mapUserRow(row) : null;
}

async function findUserById(
  id: number,
  executor: DatabaseExecutor = db,
) {
  const row = await userSelectQuery(executor)
    .where("users.iduser", "=", id)
    .executeTakeFirst();

  return row ? mapUserRow(row) : null;
}

async function findStoredUserTypeIdByName(
  storedUserType: string,
  executor: DatabaseExecutor = db,
) {
  const row = await executor
    .selectFrom("user_type")
    .select(["iduser_type", "user_type"])
    .where("user_type", "=", storedUserType)
    .executeTakeFirst();

  return row ? Number(row.iduser_type) : null;
}

export async function ensureStoredUserTypeId(
  storedUserType: string,
  executor: DatabaseExecutor = db,
) {
  const existingId = await findStoredUserTypeIdByName(storedUserType, executor);
  if (existingId) {
    return existingId;
  }

  const insertResult = await executor
    .insertInto("user_type")
    .values({ user_type: storedUserType })
    .executeTakeFirst();

  return Number(insertResult.insertId);
}

export async function createUser(
  email: string,
  storedUserTypeId: number | null,
  executor: DatabaseExecutor = db,
) {
  const normalizedEmail = normalizeEmail(email);

  const insertResult = await executor
    .insertInto("user")
    .values({
      address: normalizedEmail,
      user_type_id: storedUserTypeId,
    })
    .executeTakeFirst();

  return findUserById(Number(insertResult.insertId), executor);
}

export async function updateStoredUserTypeIdByEmail(
  email: string,
  storedUserTypeId: number | null,
  executor: DatabaseExecutor = db,
) {
  const normalizedEmail = normalizeEmail(email);

  await executor
    .updateTable("user")
    .set({ user_type_id: storedUserTypeId })
    .where(sql<boolean>`lower(${sql.ref("address")}) = ${normalizedEmail}`)
    .execute();

  return findUserByEmail(normalizedEmail, executor);
}

export async function deleteUserByEmail(
  email: string,
  executor: DatabaseExecutor = db,
) {
  const normalizedEmail = normalizeEmail(email);

  await executor
    .deleteFrom("user")
    .where(sql<boolean>`lower(${sql.ref("address")}) = ${normalizedEmail}`)
    .execute();
}

export async function countMoveRequestsForUserId(
  userId: number,
  executor: DatabaseExecutor = db,
) {
  const row = await executor
    .selectFrom("move_request")
    .select(({ fn }) => fn.count<number>("idmove_request").as("count"))
    .where("user_id", "=", userId)
    .executeTakeFirst();

  return Number(row?.count || 0);
}
