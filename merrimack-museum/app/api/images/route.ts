import { NextRequest, NextResponse } from "next/server";
import { artworkImageQuerySchema } from "@/server/artworks/schemas";
import { handleRouteError, readQueryParams } from "@/server/http";
import { getArtworkImageByArtworkIdOrThrow } from "@/server/artworks/service";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const { artwork } = readQueryParams(
      req.nextUrl.searchParams,
      artworkImageQuerySchema,
    );
    const image = await getArtworkImageByArtworkIdOrThrow(artwork);

    return NextResponse.json({
      imagePath: image.imagePath,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
