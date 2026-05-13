import { AppError } from "@/server/errors";
import {
  countArtworksUsingImagePath,
  createArtwork,
  deleteArtwork,
  findArtworkById,
  findArtworkImageByArtworkId,
  listArtworks,
  listAvailableArtworks,
  searchArtworks,
  updateArtwork,
} from "@/server/artworks/repository";
import { deleteManagedArtworkImage } from "@/server/adapters/storage";
import type { DatabaseExecutor } from "@/server/db/client";
import type { ArtworkMutationInput } from "@/server/artworks/types";

interface ArtworkCollectionOptions {
  limit?: number;
  offset?: number;
  query?: string;
  availableOnly?: boolean;
}

export async function getArtworkCollection(options: ArtworkCollectionOptions = {}) {
  const normalizedQuery = options.query?.trim();

  if (normalizedQuery) {
    return searchArtworks(normalizedQuery, {
      limit: options.limit,
      offset: options.offset,
      availableOnly: options.availableOnly,
    });
  }

  if (options.availableOnly) {
    return listAvailableArtworks({
      limit: options.limit,
      offset: options.offset,
    });
  }

  return listArtworks({
    limit: options.limit,
    offset: options.offset,
  });
}

export async function getArtworkByIdOrThrow(id: number) {
  const artwork = await findArtworkById(id);
  if (!artwork) {
    throw new AppError(404, "Artwork not found");
  }

  return artwork;
}

export async function getArtworkImageByArtworkIdOrThrow(id: number) {
  const imagePath = await findArtworkImageByArtworkId(id);

  if (!imagePath) {
    throw new AppError(404, "Image not found for artwork");
  }

  return { imagePath };
}

export async function addArtworkToCatalog(input: ArtworkMutationInput) {
  const artwork = await createArtwork(input);

  if (!artwork) {
    throw new AppError(500, "Unable to create artwork");
  }

  return artwork;
}

async function cleanupReplacedArtworkImage(options: {
  previousImagePath: string | null;
  nextImagePath: string | null | undefined;
}) {
  if (
    options.nextImagePath === undefined ||
    !options.previousImagePath ||
    options.previousImagePath === options.nextImagePath
  ) {
    return;
  }

  const remainingUsageCount = await countArtworksUsingImagePath(
    options.previousImagePath,
  );
  if (remainingUsageCount > 0) {
    return;
  }

  try {
    await deleteManagedArtworkImage(options.previousImagePath);
  } catch (error) {
    console.error("Unable to delete replaced artwork image:", error);
  }
}

export async function updateArtworkInCatalog(
  id: number,
  input: ArtworkMutationInput,
  executor?: DatabaseExecutor,
) {
  const existingArtwork = await findArtworkById(id, executor);
  if (!existingArtwork) {
    throw new AppError(404, "Artwork not found");
  }

  const artwork = await updateArtwork(id, input, executor);
  if (!artwork) {
    throw new AppError(500, "Unable to update artwork");
  }

  if (!executor) {
    await cleanupReplacedArtworkImage({
      previousImagePath: existingArtwork.imagePath,
      nextImagePath: "imagePath" in input ? input.imagePath : undefined,
    });
  }

  return artwork;
}

export async function deleteArtworkFromCatalog(id: number) {
  await getArtworkByIdOrThrow(id);
  await deleteArtwork(id);
}
