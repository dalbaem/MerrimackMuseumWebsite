import { NextRequest, NextResponse } from "next/server";
import {
  ensureActorMatchesEmail,
  getRequestActor,
  requireRole,
} from "@/server/auth/requestActor";
import { AppError } from "@/server/errors";
import {
  handleRouteError,
  readJsonBody,
  readQueryParams,
  requireGuardActor,
} from "@/server/http";
import {
  createMoveRequestSchema,
  moveRequestListQuerySchema,
} from "@/server/moveRequests/schemas";
import {
  createMuseumMoveRequest,
  getApprovedMoveRequests,
  getPendingMoveRequests,
  getRequestsForUser,
} from "@/server/moveRequests/service";
import { toMoveRequestDto } from "@/server/http/presenters";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { email, state } = readQueryParams(
      req.nextUrl.searchParams,
      moveRequestListQuerySchema,
    );

    if ((email && state) || (!email && !state)) {
      throw new AppError(400, "Provide either a move request state or email filter.");
    }

    if (state) {
      await requireGuardActor(requireRole(req, ["admin"]));

      const requests =
        state === "pending"
          ? await getPendingMoveRequests()
          : await getApprovedMoveRequests();

      return NextResponse.json(requests.map(toMoveRequestDto));
    }

    const actor = await getRequestActor(req);
    if (!actor) {
      throw new AppError(401, "Authentication required");
    }

    if (!email) {
      throw new AppError(400, "Provide either a move request state or email filter.");
    }

    if (actor.role !== "admin" && !ensureActorMatchesEmail(actor, email)) {
      throw new AppError(403, "Forbidden");
    }

    const requests = await getRequestsForUser(email);
    return NextResponse.json(requests.map(toMoveRequestDto));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await readJsonBody(req, createMoveRequestSchema);
    const actor = await getRequestActor(req);

    if (!actor) {
      throw new AppError(401, "Authentication required");
    }

    const isSelf = ensureActorMatchesEmail(actor, data.email);
    const canSubmit =
      actor.role === "admin" || (actor.role === "faculty" && isSelf);

    if (!canSubmit) {
      throw new AppError(403, "Forbidden");
    }

    await createMuseumMoveRequest({
      email: data.email,
      artworkId: data.artworkId,
      toLocation: data.toLocation,
      requestNotes: data.requestNotes,
      requestedAt: data.requestedAt,
    }, { actor });

    return NextResponse.json(
      { message: "Request saved successfully" },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
