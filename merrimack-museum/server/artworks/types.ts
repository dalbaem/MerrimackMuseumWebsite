export interface ArtworkRecord {
  id: number;
  title: string | null;
  dateCreatedMonth: number | null;
  dateCreatedYear: number | null;
  comments: string | null;
  width: string | null;
  height: string | null;
  size: string | null;
  artistName: string | null;
  donorName: string | null;
  locationName: string | null;
  categoryName: string | null;
  imagePath: string | null;
}

export interface ArtworkMutationInput {
  title: string | null;
  dateCreatedMonth: number | null;
  dateCreatedYear: number | null;
  comments: string | null;
  width: string | null;
  height: string | null;
  size: string | null;
  artistName: string | null;
  donorName: string | null;
  locationName: string | null;
  categoryName: string | null;
  imagePath?: string | null;
}
