import type { AppRole } from "@/shared/types/user";

export interface ArtworkDto {
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

export interface UserDto {
  email: string;
  role: AppRole;
}

export interface UserRoleDto {
  email: string;
  role: AppRole;
}

export interface MoveRequestDto {
  id: number;
  user: {
    email: string;
  };
  artwork: ArtworkDto;
  toLocation: string | null;
  isPending: boolean;
  isApproved: boolean;
  isComplete: boolean;
  requestNotes: string;
  requestedAt: string;
}

export interface ArtworkImageDto {
  imagePath: string;
}
