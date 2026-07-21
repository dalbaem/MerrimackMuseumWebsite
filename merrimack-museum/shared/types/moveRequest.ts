export const MOVE_REQUEST_APPROVAL_STATUSES = ["approve", "deny"] as const;
export const MOVE_REQUEST_COMPLETION_STATUSES = [
  "complete",
  "cancel",
  "sendback",
] as const;
export const MOVE_REQUEST_LIST_STATES = ["pending", "approved"] as const;
export const MOVE_REQUEST_STATUSES = [
  "pending",
  "in_movement",
  "completed",
  "denied",
  "canceled_in_movement",
] as const;

export type MoveRequestApprovalStatus =
  (typeof MOVE_REQUEST_APPROVAL_STATUSES)[number];

export type MoveRequestCompletionStatus =
  (typeof MOVE_REQUEST_COMPLETION_STATUSES)[number];

export type MoveRequestListState = (typeof MOVE_REQUEST_LIST_STATES)[number];

export type MoveRequestStatus = (typeof MOVE_REQUEST_STATUSES)[number];

export const MOVE_REQUEST_NOTES_MAX_LENGTH = 200;

export interface MoveRequestCompletionActionInput {
  artworkId?: number;
  completionStatus: MoveRequestCompletionStatus;
  toLocation?: string | null;
}

export function isMoveRequestStatus(value: unknown): value is MoveRequestStatus {
  return (
    typeof value === "string" &&
    (MOVE_REQUEST_STATUSES as readonly string[]).includes(value)
  );
}

export function getMoveRequestStatusFromFlags({
  isApproved,
  isComplete,
  isPending,
  status,
}: {
  isApproved?: boolean | null;
  isComplete?: boolean | null;
  isPending?: boolean | null;
  status?: string | null;
}): MoveRequestStatus {
  if (isMoveRequestStatus(status)) {
    return status;
  }

  if (isComplete) {
    return "completed";
  }

  if (isPending) {
    return "pending";
  }

  if (isApproved) {
    return "in_movement";
  }

  return "denied";
}

export function getMoveRequestStatusLabel(status: MoveRequestStatus) {
  switch (status) {
    case "pending":
      return "Pending request";
    case "in_movement":
      return "Request in movement";
    case "completed":
      return "Completed request";
    case "denied":
      return "Denied request";
    case "canceled_in_movement":
      return "Request canceled in movement";
    default:
      return "Pending request";
  }
}

export function getMoveRequestStatusColor(status: MoveRequestStatus) {
  switch (status) {
    case "pending":
      return "yellow";
    case "in_movement":
      return "blue";
    case "completed":
      return "green";
    case "denied":
      return "red";
    case "canceled_in_movement":
      return "orange";
    default:
      return "gray";
  }
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
