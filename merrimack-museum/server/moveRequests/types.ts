import type { ArtworkRecord } from "@/server/artworks/types";
import type { UserRecord } from "@/server/users/types";
import type { MoveRequestStatus } from "@/shared/types/moveRequest";

export interface MoveRequestRecord {
  id: number;
  user: UserRecord;
  artwork: ArtworkRecord;
  fromLocation: string | null;
  toLocation: string | null;
  status: MoveRequestStatus;
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
  fromLocation: string | null;
  toLocation: string | null;
  requestNotes: string | null;
  status: MoveRequestStatus;
  userId: number;
  requestedAt: string;
}

export interface MoveRequestUpdateInput {
  fromLocation?: string | null;
  toLocation?: string | null;
  requestNotes?: string | null;
  status?: MoveRequestStatus;
  isPending?: boolean;
  isApproved?: boolean;
  isComplete?: boolean;
}
