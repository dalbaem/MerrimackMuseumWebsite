import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/requestActor";
import {
  handleRouteError,
  readRouteParams,
  requireGuardActor,
} from "@/server/http";
import { userEmailParamsSchema } from "@/server/users/schemas";
import { deleteUser } from "@/server/users/service";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> },
) {
  try {
    await requireGuardActor(requireRole(req, ["admin"]));
    const { email } = readRouteParams(await params, userEmailParamsSchema);
    await deleteUser(email);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
