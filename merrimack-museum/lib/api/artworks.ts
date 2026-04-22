import { requestJson } from "@/lib/api/http";
import type { ArtworkDto } from "@/shared/types/api";
import type {
  ArtworkAvailability,
  ArtworkMutationFields,
} from "@/shared/types/artwork";

interface FetchArtworksOptions {
  availability?: ArtworkAvailability;
  limit?: number;
  offset?: number;
  query?: string;
}

interface ArtworkUploadFields {
  uploadedFileName?: string;
  uploadedImage?: string;
}

interface RequiredArtworkUploadFields {
  uploadedFileName: string;
  uploadedImage: string;
}
function buildArtworkListPath(options: FetchArtworksOptions = {}) {
  const searchParams = new URLSearchParams();

  if (options.availability && options.availability !== "all") {
    searchParams.set("availability", options.availability);
  }

  if (typeof options.limit === "number") {
    searchParams.set("limit", options.limit.toString());
  }

  if (typeof options.offset === "number") {
    searchParams.set("offset", options.offset.toString());
  }

  const normalizedQuery = options.query?.trim();
  if (normalizedQuery) {
    searchParams.set("query", normalizedQuery);
  }

  const queryString = searchParams.toString();
  return queryString ? `/api/artworks?${queryString}` : "/api/artworks";
}
function normalizeArtworkId(artworkId: string | number) {
  const normalizedId = artworkId.toString().trim();

  if (!normalizedId) {
    throw new Error("Artwork id is required");
  }

  return normalizedId;
}
function buildArtworkMutationBody(
  values: ArtworkMutationFields,
  upload: ArtworkUploadFields = {},
) {
  return {
    ...values,
    ...(upload.uploadedFileName
      ? { uploadedFileName: upload.uploadedFileName }
      : {}),
    ...(upload.uploadedImage ? { uploadedImage: upload.uploadedImage } : {}),
  };
}

export async function fetchArtworks(options: FetchArtworksOptions = {}) {
  return requestJson<ArtworkDto[]>(buildArtworkListPath(options), {
    method: "GET",
  });
}

export async function fetchAvailableArtworks(
  options: Omit<FetchArtworksOptions, "availability"> = {},
) {
  return fetchArtworks({
    ...options,
    availability: "available",
  });
}

export async function searchArtworks(
  query: string,
  options: Omit<FetchArtworksOptions, "query"> = {},
) {
  return fetchArtworks({
    ...options,
    query,
  });
}

export async function fetchArtworkById(artworkId: string | number) {
  return requestJson<ArtworkDto>(`/api/artworks/${normalizeArtworkId(artworkId)}`, {
    method: "GET",
  });
}

export async function createArtwork(
  values: ArtworkMutationFields,
  upload: RequiredArtworkUploadFields,
) {
  return requestJson<ArtworkDto>("/api/artworks", {
    method: "POST",
    body: JSON.stringify(buildArtworkMutationBody(values, upload)),
  });
}

export async function updateArtwork(
  artworkId: string | number,
  values: ArtworkMutationFields,
  upload: ArtworkUploadFields = {},
) {
  const normalizedArtworkId = normalizeArtworkId(artworkId);

  return requestJson<ArtworkDto>(`/api/artworks/${normalizedArtworkId}`, {
    method: "PUT",
    body: JSON.stringify(buildArtworkMutationBody(values, upload)),
  });
}

export async function deleteArtwork(artworkId: string | number) {
  return requestJson<void>(`/api/artworks/${normalizeArtworkId(artworkId)}`, {
    method: "DELETE",
  });
}
