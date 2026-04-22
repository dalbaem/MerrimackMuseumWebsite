import type { SyntheticEvent } from "react";
import type { ArtworkDto } from "@/shared/types/api";

export function readArtworkText(value?: string | null) {
  return value?.trim() || null;
}

function formatMonth(month?: number | null) {
  if (!month || month < 1 || month > 12) {
    return null;
  }

  return new Date(2000, month - 1, 1).toLocaleString("en-US", {
    month: "long",
  });
}

export function getKnownArtworkDate(artwork: ArtworkDto | null | undefined) {
  if (!artwork) {
    return null;
  }

  const month = formatMonth(artwork.dateCreatedMonth);
  const year = artwork.dateCreatedYear;

  if (month && year) {
    return `${month} ${year}`;
  }

  if (month) {
    return month;
  }

  if (year) {
    return `${year}`;
  }

  return null;
}

export function getArtworkDimensions(
  artwork: ArtworkDto | null | undefined,
) {
  if (!artwork) {
    return null;
  }

  const width = readArtworkText(artwork.width);
  const height = readArtworkText(artwork.height);

  if (width && height) {
    return `${width} x ${height}`;
  }

  if (width) {
    return `Width ${width}`;
  }

  if (height) {
    return `Height ${height}`;
  }

  return null;
}

export function getArtworkTitle(value?: string | null) {
  return readArtworkText(value) || "Untitled";
}

export function getArtworkAltText(artwork: ArtworkDto, title: string) {
  return title === "Untitled" ? `Artwork ${artwork.id}` : `Artwork: ${title}`;
}

export function getSearchResultsLabel(query: string, count: number) {
  if (!query.trim()) {
    return `${count} work${count === 1 ? "" : "s"} currently loaded`;
  }

  return `${count} result${count === 1 ? "" : "s"} for "${query.trim()}"`;
}

export function preventImageInteractions(event: SyntheticEvent) {
  event.preventDefault();
}
