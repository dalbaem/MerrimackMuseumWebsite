import type { RequestActor } from "@/server/auth/requestActor";
import { db, type DatabaseExecutor } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { updateArtworkInCatalog } from "@/server/artworks/service";
import {
  countActiveMoveRequestsForArtwork,
  createMoveRequest,
  deleteMoveRequest,
  findMoveRequestById,
  listMoveRequestsByState,
  listMoveRequestsByUserEmail,
  updateMoveRequestFields,
} from "@/server/moveRequests/repository";
import { findUserByEmail } from "@/server/users/repository";
import { ensurePrivilegedUser } from "@/server/users/service";
import type { MoveRequestCreateInput } from "@/server/moveRequests/types";
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
      .select("idArtwork")
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
        toLocation: normalizedDestination,
        requestNotes: normalizeRequestText(input.requestNotes),
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

  if (request.isComplete) {
    throw new AppError(400, "Completed requests cannot be edited.");
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

  if (!request.isPending || request.isComplete) {
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

  if (request.isComplete) {
    throw new AppError(400, "Completed requests cannot be updated.");
  }

  if (!request.isPending) {
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
      isPending: false,
      isApproved: true,
    });

    return requireStoredMoveRequest(updatedRequest, "Unable to update move request.");
  }

  const updatedRequest = await updateMoveRequestFields(id, {
    isPending: false,
    isApproved: false,
  });

  return requireStoredMoveRequest(updatedRequest, "Unable to update move request.");
}

export async function updateMoveProgress(
  id: number,
  completionStatus: "complete" | "sendback",
  artworkId?: number,
  toLocation?: string | null,
) {
  const request = await getMoveRequestByIdOrThrow(id);

  if (request.isComplete) {
    throw new AppError(400, "Completed requests cannot be updated.");
  }

  if (request.isPending || !request.isApproved) {
    throw new AppError(400, "Only approved requests in movement can be updated.");
  }

  if (completionStatus === "sendback") {
    const updatedRequest = await updateMoveRequestFields(id, {
      isComplete: false,
      isApproved: false,
      isPending: true,
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
        isComplete: true,
        isPending: false,
        toLocation: normalizedLocation,
      },
      trx,
    );

    return requireStoredMoveRequest(updatedRequest, "Unable to update move request.");
  });
}
