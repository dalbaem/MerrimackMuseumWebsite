import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/requestActor";
import {
  handleRouteError,
  readJsonBody,
  requireGuardActor,
} from "@/server/http";
import { updateUserRoleRequestSchema } from "@/server/users/schemas";
import { updateUserRole } from "@/server/users/service";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  try {
    await requireGuardActor(requireRole(req, ["admin"]));
    const { email, role } = await readJsonBody(req, updateUserRoleRequestSchema);
    const user = await updateUserRole(email, role);

    return NextResponse.json(
      {
        email: user.email,
        role: user.role,
      },
      { status: 200 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
