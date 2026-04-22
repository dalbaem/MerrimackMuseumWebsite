import { NextRequest, NextResponse } from "next/server";
import { resolveArtworkMutationInput } from "@/server/adapters/storage";
import { requireRole } from "@/server/auth/requestActor";
import {
  handleRouteError,
  readJsonBody,
  readRouteParams,
  requireGuardActor,
} from "@/server/http";
import {
  artworkIdParamsSchema,
  artworkMutationRequestSchema,
} from "@/server/artworks/schemas";
import {
  deleteArtworkFromCatalog,
  getArtworkByIdOrThrow,
  updateArtworkInCatalog,
} from "@/server/artworks/service";
import { toArtworkDto } from "@/server/http/presenters";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireGuardActor(requireRole(req, ["admin"]));
    const { id } = readRouteParams(await params, artworkIdParamsSchema);
    const artwork = await getArtworkByIdOrThrow(id);
    return NextResponse.json(toArtworkDto(artwork));
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
    const { id } = readRouteParams(await params, artworkIdParamsSchema);
    const data = await readJsonBody(req, artworkMutationRequestSchema);
    const input = await resolveArtworkMutationInput(data, {
      requireImage: false,
    });
    const artwork = await updateArtworkInCatalog(id, input);

    return NextResponse.json(toArtworkDto(artwork));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireGuardActor(requireRole(req, ["admin"]));
    const { id } = readRouteParams(await params, artworkIdParamsSchema);
    await deleteArtworkFromCatalog(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
