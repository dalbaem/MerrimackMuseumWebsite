import type {
  ArtworkDto,
  MoveRequestDto,
  UserDto,
} from "@/shared/types/api";
import type { ArtworkRecord } from "@/server/artworks/types";
import type { MoveRequestRecord } from "@/server/moveRequests/types";
import type { UserRecord } from "@/server/users/types";

export function toArtworkDto(artwork: ArtworkRecord): ArtworkDto {
  return {
    id: artwork.id,
    title: artwork.title,
    dateCreatedMonth: artwork.dateCreatedMonth,
    dateCreatedYear: artwork.dateCreatedYear,
    comments: artwork.comments,
    width: artwork.width,
    height: artwork.height,
    size: artwork.size,
    artistName: artwork.artistName,
    donorName: artwork.donorName,
    locationName: artwork.locationName,
    categoryName: artwork.categoryName,
    imagePath: artwork.imagePath,
  };
}

export function toUserDto(user: UserRecord): UserDto {
  return {
    email: user.email,
    role: user.role,
  };
}

export function toMoveRequestDto(request: MoveRequestRecord): MoveRequestDto {
  return {
    id: request.id,
    user: {
      email: request.user.email,
    },
    artwork: toArtworkDto(request.artwork),
    fromLocation: request.fromLocation,
    toLocation: request.toLocation,
    status: request.status,
    isPending: request.isPending,
    isApproved: request.isApproved,
    isComplete: request.isComplete,
    requestNotes: request.requestNotes,
    requestedAt: request.requestedAt,
  };
}
