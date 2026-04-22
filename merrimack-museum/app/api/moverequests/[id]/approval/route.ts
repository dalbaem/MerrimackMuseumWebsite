import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/requestActor";
import {
  moveRequestApprovalActionRequestSchema,
  moveRequestIdParamsSchema,
} from "@/server/moveRequests/schemas";
import {
  handleRouteError,
  readJsonBody,
  readRouteParams,
  requireGuardActor,
} from "@/server/http";
import { toMoveRequestDto } from "@/server/http/presenters";
import { reviewMoveRequest } from "@/server/moveRequests/service";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireGuardActor(requireRole(req, ["admin"]));
    const { id } = readRouteParams(await params, moveRequestIdParamsSchema);
    const { approvalStatus } = await readJsonBody(
      req,
      moveRequestApprovalActionRequestSchema,
    );
    const request = await reviewMoveRequest(id, approvalStatus);

    return NextResponse.json(toMoveRequestDto(request));
  } catch (error) {
    return handleRouteError(error);
  }
}
