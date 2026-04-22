import type { ArtworkRecord } from "@/server/artworks/types";
import type { UserRecord } from "@/server/users/types";

export interface MoveRequestRecord {
  id: number;
  user: UserRecord;
  artwork: ArtworkRecord;
  toLocation: string | null;
  isPending: boolean;
  isApproved: boolean;
  isComplete: boolean;
  requestNotes: string;
  requestedAt: string;
}

export interface MoveRequestCreateInput {
  email: string;
  artworkId: number;
  toLocation: string | null;
  requestNotes: string | null;
  requestedAt: string;
}

export interface MoveRequestInsertInput {
  artworkId: number;
  toLocation: string | null;
  requestNotes: string | null;
  userId: number;
  requestedAt: string;
}

export interface MoveRequestUpdateInput {
  toLocation?: string | null;
  requestNotes?: string | null;
  isPending?: boolean;
  isApproved?: boolean;
  isComplete?: boolean;
}
