export const MOVE_REQUEST_APPROVAL_STATUSES = ["approve", "deny"] as const;
export const MOVE_REQUEST_COMPLETION_STATUSES = ["complete", "sendback"] as const;
export const MOVE_REQUEST_LIST_STATES = ["pending", "approved"] as const;

export type MoveRequestApprovalStatus =
  (typeof MOVE_REQUEST_APPROVAL_STATUSES)[number];

export type MoveRequestCompletionStatus =
  (typeof MOVE_REQUEST_COMPLETION_STATUSES)[number];

export type MoveRequestListState = (typeof MOVE_REQUEST_LIST_STATES)[number];

export const MOVE_REQUEST_NOTES_MAX_LENGTH = 200;

export interface MoveRequestCompletionActionInput {
  artworkId?: number;
  completionStatus: MoveRequestCompletionStatus;
  toLocation?: string | null;
}

export function formatMoveRequestDateTime(
  value: string | null | undefined,
  fallback = "Not available",
) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
