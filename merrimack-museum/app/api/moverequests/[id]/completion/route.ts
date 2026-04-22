import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/requestActor";
import {
  moveRequestCompletionActionRequestSchema,
  moveRequestIdParamsSchema,
} from "@/server/moveRequests/schemas";
import {
  handleRouteError,
  readJsonBody,
  readRouteParams,
  requireGuardActor,
} from "@/server/http";
import { toMoveRequestDto } from "@/server/http/presenters";
import { updateMoveProgress } from "@/server/moveRequests/service";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireGuardActor(requireRole(req, ["admin"]));
    const { id } = readRouteParams(await params, moveRequestIdParamsSchema);
    const { artworkId, completionStatus, toLocation } = await readJsonBody(
      req,
      moveRequestCompletionActionRequestSchema,
    );
    const request = await updateMoveProgress(
      id,
      completionStatus,
      artworkId,
      toLocation,
    );

    return NextResponse.json(toMoveRequestDto(request));
  } catch (error) {
    return handleRouteError(error);
  }
}
