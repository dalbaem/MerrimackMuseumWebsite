import type { Generated } from "kysely";

export interface ArtistTable {
  idArtist: Generated<number>;
  artist_name: string | null;
}

export interface DonorTable {
  idDonor: Generated<number>;
  donor_name: string | null;
}

export interface LocationTable {
  idLocation: Generated<number>;
  Location: string | null;
}

export interface CategoryTable {
  idCategory: Generated<number>;
  category: string | null;
}

export interface ImagesTable {
  idimages: Generated<number>;
  image_path: string | null;
}

export interface ArtworkTable {
  idArtwork: Generated<number>;
  title: string | null;
  date_created_month: number | null;
  date_created_year: number | null;
  comments: string | null;
  width: string | null;
  height: string | null;
  artist_id: number | null;
  donor_id: number | null;
  location_id: number | null;
  category_id: number | null;
  image_path_id: number | null;
  size: string | null;
}

export interface UserTypeTable {
  iduser_type: Generated<number>;
  user_type: string | null;
}

export interface UserTable {
  iduser: Generated<number>;
  address: string | null;
  user_type_id: number | null;
}

export interface MoveRequestTable {
  idmove_request: Generated<number>;
  artwork_id: number | null;
  to_location: string | null;
  is_pending: number;
  is_approved: number;
  comments: string | null;
  user_id: number;
  time_stamp: string;
  is_complete: number;
}

export interface MuseumDatabase {
  artist: ArtistTable;
  artwork: ArtworkTable;
  category: CategoryTable;
  donor: DonorTable;
  images: ImagesTable;
  location: LocationTable;
  move_request: MoveRequestTable;
  user: UserTable;
  user_type: UserTypeTable;
}
