import { NextRequest, NextResponse } from "next/server";
import {
  getRequestActor,
  requireRole,
} from "@/server/auth/requestActor";
import { AppError } from "@/server/errors";
import {
  handleRouteError,
  readJsonBody,
  readRouteParams,
  requireGuardActor,
} from "@/server/http";
import {
  editMoveRequestSchema,
  moveRequestIdParamsSchema,
} from "@/server/moveRequests/schemas";
import {
  deletePendingMoveRequest,
  editPendingMoveRequest,
  getMoveRequestByIdOrThrow,
} from "@/server/moveRequests/service";
import { toMoveRequestDto } from "@/server/http/presenters";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireGuardActor(requireRole(req, ["admin"]));
    const { id } = readRouteParams(await params, moveRequestIdParamsSchema);
    const request = await getMoveRequestByIdOrThrow(id);
    return NextResponse.json(toMoveRequestDto(request));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireGuardActor(requireRole(req, ["admin"]));
    const { id } = readRouteParams(await params, moveRequestIdParamsSchema);
    const data = await readJsonBody(req, editMoveRequestSchema);
    const request = await editPendingMoveRequest(id, {
      toLocation: data.toLocation,
      requestNotes: data.requestNotes,
    });

    return NextResponse.json(toMoveRequestDto(request));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await getRequestActor(req);
    if (!actor) {
      throw new AppError(401, "Authentication required");
    }

    const { id } = readRouteParams(await params, moveRequestIdParamsSchema);
    await deletePendingMoveRequest(id, actor);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
