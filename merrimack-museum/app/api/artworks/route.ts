import { NextRequest, NextResponse } from "next/server";
import { resolveArtworkMutationInput } from "@/server/adapters/storage";
import { requireRole } from "@/server/auth/requestActor";
import {
  handleRouteError,
  readJsonBody,
  readQueryParams,
  requireGuardActor,
} from "@/server/http";
import {
  artworkCollectionQuerySchema,
  artworkMutationRequestSchema,
} from "@/server/artworks/schemas";
import {
  addArtworkToCatalog,
  getArtworkCollection,
} from "@/server/artworks/service";
import { toArtworkDto } from "@/server/http/presenters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { availability, limit, offset, query } = readQueryParams(
      request.nextUrl.searchParams,
      artworkCollectionQuerySchema,
    );
    const artworks = await getArtworkCollection({
      availableOnly: availability === "available",
      limit,
      offset,
      query,
    });

    return NextResponse.json(artworks.map(toArtworkDto));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireGuardActor(requireRole(request, ["admin"]));
    const data = await readJsonBody(request, artworkMutationRequestSchema);
    const input = await resolveArtworkMutationInput(data, { requireImage: true });
    const artwork = await addArtworkToCatalog(input);

    return NextResponse.json(toArtworkDto(artwork), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
