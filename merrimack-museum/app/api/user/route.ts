import { NextRequest, NextResponse } from "next/server";
import {
  ensureActorMatchesEmail,
  getRequestActor,
} from "@/server/auth/requestActor";
import { AppError } from "@/server/errors";
import { handleRouteError, readJsonBody } from "@/server/http";
import { userAccessRequestSchema } from "@/server/users/schemas";
import { getUserAccess } from "@/server/users/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = await readJsonBody(req, userAccessRequestSchema);
    const actor = await getRequestActor(req);

    if (!actor) {
      throw new AppError(401, "Authentication required");
    }

    if (actor.role !== "admin" && !ensureActorMatchesEmail(actor, email)) {
      throw new AppError(403, "Forbidden");
    }

    const user = await getUserAccess(email);
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
