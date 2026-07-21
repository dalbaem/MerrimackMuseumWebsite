import { sql } from "kysely";
import type { ArtworkRecord } from "@/server/artworks/types";
import { db, type DatabaseExecutor } from "@/server/db/client";
import {
  mapStoredUserTypeToRole,
  normalizeStoredText,
} from "@/server/db/legacy/transforms";
import type {
  MoveRequestInsertInput,
  MoveRequestRecord,
  MoveRequestUpdateInput,
} from "@/server/moveRequests/types";
import {
  normalizeEmail,
} from "@/shared/types/user";
import {
  getMoveRequestStatusFromFlags,
  type MoveRequestStatus,
} from "@/shared/types/moveRequest";
import type { UserRecord } from "@/server/users/types";

interface MoveRequestRow {
  id: number;
  fromLocation: string | null;
  toLocation: string | null;
  status: string | null;
  isPending: number;
  isApproved: number;
  isComplete: number;
  comments: string | null;
  requestedAt: string;
  userId: number;
  userEmail: string | null;
  userType: string | null;
  artworkId: number | null;
  artworkTitle: string | null;
  artworkDateCreatedMonth: number | null;
  artworkDateCreatedYear: number | null;
  artworkComments: string | null;
  artworkWidth: string | null;
  artworkHeight: string | null;
  artworkSize: string | null;
  artworkArtistName: string | null;
  artworkDonorName: string | null;
  artworkLocationName: string | null;
  artworkCategoryName: string | null;
  artworkImagePath: string | null;
}

function tinyIntToBoolean(value: number | boolean | null | undefined) {
  return Boolean(value);
}

function booleanToTinyInt(value: boolean | null | undefined) {
  return value ? 1 : 0;
}

function getMoveRequestFlagsForStatus(status: MoveRequestStatus) {
  return {
    isPending: status === "pending",
    isApproved: status === "in_movement" || status === "completed",
    isComplete: status === "completed",
  };
}

function moveRequestBaseQuery(executor: DatabaseExecutor = db) {
  return executor
    .selectFrom("move_request as move_request")
    .innerJoin("user as requester", "requester.iduser", "move_request.user_id")
    .leftJoin("user_type as requester_role", "requester_role.iduser_type", "requester.user_type_id")
    .leftJoin("artwork as artwork", "artwork.idArtwork", "move_request.artwork_id")
    .leftJoin("artist as artist", "artist.idArtist", "artwork.artist_id")
    .leftJoin("donor as donor", "donor.idDonor", "artwork.donor_id")
    .leftJoin("location as location", "location.idLocation", "artwork.location_id")
    .leftJoin("category as category", "category.idCategory", "artwork.category_id")
    .leftJoin("images as images", "images.idimages", "artwork.image_path_id");
}

function moveRequestSelectQuery(executor: DatabaseExecutor = db) {
  return moveRequestBaseQuery(executor).select([
    "move_request.idmove_request as id",
    "move_request.from_location as fromLocation",
    "move_request.to_location as toLocation",
    "move_request.status as status",
    "move_request.is_pending as isPending",
    "move_request.is_approved as isApproved",
    "move_request.is_complete as isComplete",
    "move_request.comments as comments",
    "move_request.time_stamp as requestedAt",
    "requester.iduser as userId",
    "requester.address as userEmail",
    "requester_role.user_type as userType",
    "artwork.idArtwork as artworkId",
    "artwork.title as artworkTitle",
    "artwork.date_created_month as artworkDateCreatedMonth",
    "artwork.date_created_year as artworkDateCreatedYear",
    "artwork.comments as artworkComments",
    "artwork.width as artworkWidth",
    "artwork.height as artworkHeight",
    "artwork.size as artworkSize",
    "artist.artist_name as artworkArtistName",
    "donor.donor_name as artworkDonorName",
    "location.Location as artworkLocationName",
    "category.category as artworkCategoryName",
    "images.image_path as artworkImagePath",
  ]);
}
function mapArtworkFromMoveRequestRow(row: MoveRequestRow): ArtworkRecord {
  return {
    id: Number(row.artworkId ?? 0),
    title: normalizeStoredText(row.artworkTitle),
    dateCreatedMonth: row.artworkDateCreatedMonth,
    dateCreatedYear: row.artworkDateCreatedYear,
    comments: normalizeStoredText(row.artworkComments),
    width: normalizeStoredText(row.artworkWidth),
    height: normalizeStoredText(row.artworkHeight),
    size: normalizeStoredText(row.artworkSize),
    artistName: normalizeStoredText(row.artworkArtistName),
    donorName: normalizeStoredText(row.artworkDonorName),
    locationName: normalizeStoredText(row.artworkLocationName),
    categoryName: normalizeStoredText(row.artworkCategoryName),
    imagePath: normalizeStoredText(row.artworkImagePath),
  };
}

function mapUserFromMoveRequestRow(row: MoveRequestRow): UserRecord {
  const email = normalizeStoredText(row.userEmail) || "";
  const storedUserType = normalizeStoredText(row.userType);

  return {
    id: row.userId,
    email,
    role: mapStoredUserTypeToRole(storedUserType),
  };
}

function mapMoveRequestRow(row: MoveRequestRow): MoveRequestRecord {
  const legacyIsPending = tinyIntToBoolean(row.isPending);
  const legacyIsApproved = tinyIntToBoolean(row.isApproved);
  const legacyIsComplete = tinyIntToBoolean(row.isComplete);
  const status = getMoveRequestStatusFromFlags({
    isApproved: legacyIsApproved,
    isComplete: legacyIsComplete,
    isPending: legacyIsPending,
    status: normalizeStoredText(row.status),
  });
  const flags = getMoveRequestFlagsForStatus(status);

  return {
    id: row.id,
    user: mapUserFromMoveRequestRow(row),
    artwork: mapArtworkFromMoveRequestRow(row),
    fromLocation: normalizeStoredText(row.fromLocation),
    toLocation: normalizeStoredText(row.toLocation),
    status,
    isPending: flags.isPending,
    isApproved: flags.isApproved,
    isComplete: flags.isComplete,
    requestNotes: normalizeStoredText(row.comments) || "",
    requestedAt: row.requestedAt,
  };
}

export async function listMoveRequestsByUserEmail(
  email: string,
  executor: DatabaseExecutor = db,
) {
  const normalizedEmail = normalizeEmail(email);

  const rows = await moveRequestSelectQuery(executor)
    .where(sql<boolean>`lower(${sql.ref("requester.address")}) = ${normalizedEmail}`)
    .orderBy("move_request.time_stamp", "desc")
    .execute();

  return rows.map(mapMoveRequestRow);
}

export async function listMoveRequestsByArtworkId(
  artworkId: number,
  executor: DatabaseExecutor = db,
) {
  const rows = await moveRequestSelectQuery(executor)
    .where("move_request.artwork_id", "=", artworkId)
    .orderBy("move_request.time_stamp", "desc")
    .execute();

  return rows.map(mapMoveRequestRow);
}

export async function listMoveRequestsByState(
  state: "pending" | "approved",
  executor: DatabaseExecutor = db,
) {
  let query = moveRequestSelectQuery(executor).orderBy(
    "move_request.time_stamp",
    "desc",
  );

  if (state === "pending") {
    query = query.where("move_request.status", "=", "pending");
  } else {
    query = query.where("move_request.status", "=", "in_movement");
  }

  const rows = await query.execute();

  return rows.map(mapMoveRequestRow);
}

export async function findMoveRequestById(
  id: number,
  executor: DatabaseExecutor = db,
) {
  const row = await moveRequestSelectQuery(executor)
    .where("move_request.idmove_request", "=", id)
    .executeTakeFirst();

  return row ? mapMoveRequestRow(row) : null;
}

export async function countActiveMoveRequestsForArtwork(
  artworkId: number,
  executor: DatabaseExecutor = db,
  excludeRequestId?: number,
) {
  let query = executor
    .selectFrom("move_request")
    .select(({ fn }) => fn.count<number>("idmove_request").as("count"))
    .where("artwork_id", "=", artworkId)
    .where("status", "in", ["pending", "in_movement"]);

  if (excludeRequestId) {
    query = query.where("idmove_request", "!=", excludeRequestId);
  }

  const row = await query.executeTakeFirst();
  return Number(row?.count || 0);
}

export async function createMoveRequest(
  input: MoveRequestInsertInput,
  executor: DatabaseExecutor = db,
) {
  const flags = getMoveRequestFlagsForStatus(input.status);

  const insertResult = await executor
    .insertInto("move_request")
    .values({
      artwork_id: input.artworkId,
      from_location: input.fromLocation,
      to_location: input.toLocation,
      status: input.status,
      is_pending: booleanToTinyInt(flags.isPending),
      is_approved: booleanToTinyInt(flags.isApproved),
      is_complete: booleanToTinyInt(flags.isComplete),
      comments: input.requestNotes,
      user_id: input.userId,
      time_stamp: input.requestedAt,
    })
    .executeTakeFirst();

  return findMoveRequestById(Number(insertResult.insertId), executor);
}
function mapMoveRequestUpdateInput(values: MoveRequestUpdateInput) {
  const updateValues: Partial<{
    from_location: string | null;
    to_location: string | null;
    status: MoveRequestStatus;
    comments: string | null;
    is_pending: number;
    is_approved: number;
    is_complete: number;
  }> = {};

  if ("toLocation" in values) {
    updateValues.to_location = values.toLocation ?? null;
  }

  if ("fromLocation" in values) {
    updateValues.from_location = values.fromLocation ?? null;
  }

  if ("status" in values && values.status) {
    updateValues.status = values.status;
  }

  if ("requestNotes" in values) {
    updateValues.comments = values.requestNotes ?? null;
  }

  if ("isPending" in values) {
    updateValues.is_pending = booleanToTinyInt(values.isPending);
  }

  if ("isApproved" in values) {
    updateValues.is_approved = booleanToTinyInt(values.isApproved);
  }

  if ("isComplete" in values) {
    updateValues.is_complete = booleanToTinyInt(values.isComplete);
  }

  return updateValues;
}

export async function updateMoveRequestFields(
  id: number,
  values: MoveRequestUpdateInput,
  executor: DatabaseExecutor = db,
) {
  const updateValues = mapMoveRequestUpdateInput(values);

  if (Object.keys(updateValues).length === 0) {
    return findMoveRequestById(id, executor);
  }

  await executor
    .updateTable("move_request")
    .set(updateValues)
    .where("idmove_request", "=", id)
    .execute();

  return findMoveRequestById(id, executor);
}

export async function deleteMoveRequest(id: number, executor: DatabaseExecutor = db) {
  await executor.deleteFrom("move_request").where("idmove_request", "=", id).execute();
}
