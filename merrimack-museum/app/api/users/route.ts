import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/server/auth/requestActor";
import {
  handleRouteError,
  readQueryParams,
  requireGuardActor,
} from "@/server/http";
import { toUserDto } from "@/server/http/presenters";
import { userSearchQuerySchema } from "@/server/users/schemas";
import { searchUsers } from "@/server/users/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireGuardActor(requireRole(request, ["admin"]));
    const filters = readQueryParams(
      request.nextUrl.searchParams,
      userSearchQuerySchema,
    );
    const users = await searchUsers(filters);

    return NextResponse.json(users.map(toUserDto));
  } catch (error) {
    return handleRouteError(error);
  }
}
