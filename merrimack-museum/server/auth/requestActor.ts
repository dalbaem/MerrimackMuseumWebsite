import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth/nextAuth";
import { getRoleForEmail } from "@/server/users/service";
import type { AppRole } from "@/shared/types/user";

export type { AppRole } from "@/shared/types/user";

export interface RequestActor {
  email: string;
  role: AppRole;
}

export async function getRequestActor(
  request: NextRequest,
): Promise<RequestActor | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return null;
  }

  let role: AppRole = "guest";

  try {
    role = await getRoleForEmail(email);
  } catch (error) {
    console.error("Error resolving user role:", error);
  }

  return {
    email,
    role,
  };
}

export async function requireAuthenticatedActor(request: NextRequest) {
  const actor = await getRequestActor(request);

  if (!actor) {
    return {
      actor: null,
      response: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }

  return { actor, response: null };
}

export async function requireRole(
  request: NextRequest,
  allowedRoles: AppRole[],
) {
  const { actor, response } = await requireAuthenticatedActor(request);
  if (!actor || response) {
    return { actor: null, response };
  }

  if (!allowedRoles.includes(actor.role)) {
    return {
      actor: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { actor, response: null };
}

export function ensureActorMatchesEmail(
  actor: RequestActor,
  requestedEmail: string | null | undefined,
) {
  if (!requestedEmail) {
    return false;
  }

  return actor.email === requestedEmail.trim().toLowerCase();
}
