import type { RequestActor } from "@/server/auth/requestActor";
import { db, type DatabaseExecutor } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { updateArtworkInCatalog } from "@/server/artworks/service";
import {
  countActiveMoveRequestsForArtwork,
  createMoveRequest,
  deleteMoveRequest,
  findMoveRequestById,
  listMoveRequestsByArtworkId,
  listMoveRequestsByState,
  listMoveRequestsByUserEmail,
  updateMoveRequestFields,
} from "@/server/moveRequests/repository";
import { findUserByEmail } from "@/server/users/repository";
import { ensurePrivilegedUser } from "@/server/users/service";
import type { MoveRequestCreateInput } from "@/server/moveRequests/types";
import type { MoveRequestCompletionStatus } from "@/shared/types/moveRequest";
import { normalizeEmail, type AppRole } from "@/shared/types/user";

function normalizeRequestText(value: unknown) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function requireStoredMoveRequest<T>(
  request: T | null,
  message: string,
) {
  if (!request) {
    throw new AppError(500, message);
  }

  return request;
}

async function resolveMoveRequestUser(
  email: string,
  actor: RequestActor | null | undefined,
  executor: DatabaseExecutor,
) {
  let user = await findUserByEmail(email, executor);

  if (
    !user &&
    actor?.isPreview &&
    actor.role !== "guest" &&
    actor.email === email
  ) {
    user = await ensurePrivilegedUser(email, actor.role, executor);
  }

  return user;
}

export async function createMuseumMoveRequest(
  input: MoveRequestCreateInput,
  options: { actor?: RequestActor | null } = {},
) {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedDestination = normalizeRequestText(input.toLocation);

  return db.transaction().execute(async (trx) => {
    const artwork = await trx
      .selectFrom("artwork")
      .leftJoin("location as location", "location.idLocation", "artwork.location_id")
      .select([
        "artwork.idArtwork as id",
        "location.Location as locationName",
      ])
      .where("idArtwork", "=", input.artworkId)
      .forUpdate()
      .executeTakeFirst();

    if (!artwork) {
      throw new AppError(404, "Artwork not found.");
    }

    const user = await resolveMoveRequestUser(normalizedEmail, options.actor, trx);

    if (!user) {
      throw new AppError(400, "The specified user does not exist.");
    }

    const activeRequestCount = await countActiveMoveRequestsForArtwork(
      input.artworkId,
      trx,
    );
    if (activeRequestCount > 0) {
      throw new AppError(400, "This artwork already has an active move request.");
    }

    const createdRequest = await createMoveRequest(
      {
        artworkId: input.artworkId,
        fromLocation: normalizeRequestText(artwork.locationName),
        toLocation: normalizedDestination,
        requestNotes: normalizeRequestText(input.requestNotes),
        status: "pending",
        userId: user.id,
        requestedAt: input.requestedAt,
      },
      trx,
    );

    return requireStoredMoveRequest(createdRequest, "Unable to create move request.");
  });
}

export async function getRequestsForUser(email: string) {
  return listMoveRequestsByUserEmail(email);
}

export async function getRequestsForArtwork(artworkId: number) {
  return listMoveRequestsByArtworkId(artworkId);
}

export async function getMoveRequestByIdOrThrow(id: number) {
  const request = await findMoveRequestById(id);
  if (!request) {
    throw new AppError(404, "Move request not found");
  }

  return request;
}

export async function getPendingMoveRequests() {
  return listMoveRequestsByState("pending");
}

export async function getApprovedMoveRequests() {
  return listMoveRequestsByState("approved");
}

export async function editPendingMoveRequest(
  id: number,
  changes: {
    toLocation?: string | null;
    requestNotes?: string | null;
  },
) {
  const request = await getMoveRequestByIdOrThrow(id);

  if (
    request.status === "completed" ||
    request.status === "denied" ||
    request.status === "canceled_in_movement"
  ) {
    throw new AppError(400, "Finished requests cannot be edited.");
  }

  const updatedRequest = await updateMoveRequestFields(id, {
    toLocation:
      changes.toLocation === undefined
        ? undefined
        : normalizeRequestText(changes.toLocation),
    requestNotes:
      changes.requestNotes === undefined
        ? undefined
        : normalizeRequestText(changes.requestNotes),
  });

  return requireStoredMoveRequest(updatedRequest, "Unable to update move request.");
}

export async function deletePendingMoveRequest(
  id: number,
  actor: { email: string; role: AppRole },
) {
  const request = await getMoveRequestByIdOrThrow(id);

  if (request.status !== "pending") {
    throw new AppError(400, "Only pending requests can be deleted.");
  }

  if (actor.role !== "admin" && actor.role !== "faculty") {
    throw new AppError(403, "Forbidden");
  }

  if (
    actor.role !== "admin" &&
    normalizeEmail(request.user.email) !== actor.email
  ) {
    throw new AppError(403, "Forbidden");
  }

  await deleteMoveRequest(id);
}

export async function reviewMoveRequest(
  id: number,
  approvalStatus: "approve" | "deny",
) {
  const request = await getMoveRequestByIdOrThrow(id);

  if (request.status !== "pending") {
    throw new AppError(400, "Only pending requests can be reviewed.");
  }

  if (approvalStatus === "approve") {
    if (!normalizeRequestText(request.toLocation)) {
      throw new AppError(
        400,
        "A destination is required before approving a move request.",
      );
    }

    const updatedRequest = await updateMoveRequestFields(id, {
      status: "in_movement",
      isPending: false,
      isApproved: true,
      isComplete: false,
    });

    return requireStoredMoveRequest(updatedRequest, "Unable to update move request.");
  }

  const updatedRequest = await updateMoveRequestFields(id, {
    status: "denied",
    isPending: false,
    isApproved: false,
    isComplete: false,
  });

  return requireStoredMoveRequest(updatedRequest, "Unable to update move request.");
}

export async function updateMoveProgress(
  id: number,
  completionStatus: MoveRequestCompletionStatus,
  artworkId?: number,
  toLocation?: string | null,
) {
  const request = await getMoveRequestByIdOrThrow(id);

  if (request.status !== "in_movement") {
    throw new AppError(400, "Only approved requests in movement can be updated.");
  }

  if (completionStatus === "sendback" || completionStatus === "cancel") {
    const updatedRequest = await updateMoveRequestFields(id, {
      status: "canceled_in_movement",
      isComplete: false,
      isApproved: false,
      isPending: false,
    });

    return requireStoredMoveRequest(updatedRequest, "Unable to update move request.");
  }

  if (artworkId && artworkId !== request.artwork.id) {
    throw new AppError(
      400,
      "Artwork id does not match the move request.",
    );
  }

  if (!artworkId && !request.artwork.id) {
    throw new AppError(
      400,
      "Artwork id is required to complete this movement request.",
    );
  }

  const normalizedLocation = normalizeRequestText(toLocation);
  if (!normalizedLocation) {
    throw new AppError(
      400,
      "A destination is required to complete this movement request.",
    );
  }

  return db.transaction().execute(async (trx) => {
    const existingRequest = await findMoveRequestById(id, trx);
    if (!existingRequest) {
      throw new AppError(404, "Move request not found");
    }

    const targetArtworkId = existingRequest.artwork.id;

    await updateArtworkInCatalog(targetArtworkId, {
      title: existingRequest.artwork.title,
      dateCreatedMonth: existingRequest.artwork.dateCreatedMonth,
      dateCreatedYear: existingRequest.artwork.dateCreatedYear,
      comments: existingRequest.artwork.comments,
      width: existingRequest.artwork.width,
      height: existingRequest.artwork.height,
      size: existingRequest.artwork.size,
      artistName: existingRequest.artwork.artistName,
      donorName: existingRequest.artwork.donorName,
      locationName: normalizedLocation,
      categoryName: existingRequest.artwork.categoryName,
    }, trx);

    const updatedRequest = await updateMoveRequestFields(
      id,
      {
        status: "completed",
        isComplete: true,
        isApproved: true,
        isPending: false,
        toLocation: normalizedLocation,
      },
      trx,
    );

    return requireStoredMoveRequest(updatedRequest, "Unable to update move request.");
  });
}
