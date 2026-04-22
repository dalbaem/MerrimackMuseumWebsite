export const ARTWORK_AVAILABILITY_OPTIONS = ["all", "available"] as const;

export type ArtworkAvailability = (typeof ARTWORK_AVAILABILITY_OPTIONS)[number];

export interface ArtworkMutationFields {
  title: string;
  artistName: string;
  donorName: string;
  categoryName: string;
  locationName: string;
  width: string;
  height: string;
  dateCreatedMonth: string;
  dateCreatedYear: string;
  comments: string;
  imagePath: string;
  size: string;
}
