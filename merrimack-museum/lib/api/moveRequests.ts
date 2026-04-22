import { requestJson } from "@/lib/api/http";
import type { MoveRequestDto } from "@/shared/types/api";
import type {
  MoveRequestApprovalStatus,
  MoveRequestCompletionActionInput,
  MoveRequestListState,
} from "@/shared/types/moveRequest";

interface CreateMoveRequestInput {
  artworkId: number;
  email: string;
  requestNotes: string | null;
  requestedAt: string;
  toLocation: string | null;
}

interface UpdateMoveRequestInput {
  requestNotes?: string | null;
  toLocation?: string | null;
}
function buildMoveRequestListPath(params: {
  email?: string;
  state?: MoveRequestListState;
}) {
  const searchParams = new URLSearchParams();

  if (params.email) {
    searchParams.set("email", params.email);
  }

  if (params.state) {
    searchParams.set("state", params.state);
  }

  return `/api/moverequests?${searchParams.toString()}`;
}
function normalizeMoveRequestId(requestId: string | number) {
  const normalizedId = requestId.toString().trim();

  if (!normalizedId) {
    throw new Error("Move request id is required");
  }

  return normalizedId;
}

export async function fetchMoveRequestsByState(state: MoveRequestListState) {
  return requestJson<MoveRequestDto[]>(buildMoveRequestListPath({ state }), {
    method: "GET",
  });
}

export async function fetchMoveRequestsForUser(email: string) {
  return requestJson<MoveRequestDto[]>(buildMoveRequestListPath({ email }), {
    method: "GET",
  });
}

export async function fetchMoveRequestById(requestId: string | number) {
  return requestJson<MoveRequestDto>(
    `/api/moverequests/${normalizeMoveRequestId(requestId)}`,
    {
      method: "GET",
    },
  );
}

export async function createMoveRequest(input: CreateMoveRequestInput) {
  return requestJson<{ message: string }>("/api/moverequests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateMoveRequest(
  requestId: string | number,
  input: UpdateMoveRequestInput,
) {
  return requestJson<MoveRequestDto>(
    `/api/moverequests/${normalizeMoveRequestId(requestId)}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export async function deleteMoveRequest(requestId: string | number) {
  return requestJson<void>(
    `/api/moverequests/${normalizeMoveRequestId(requestId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function applyMoveRequestApproval(
  requestId: string | number,
  approvalStatus: MoveRequestApprovalStatus,
) {
  return requestJson<MoveRequestDto>(
    `/api/moverequests/${normalizeMoveRequestId(requestId)}/approval`,
    {
      method: "PUT",
      body: JSON.stringify({ approvalStatus }),
    },
  );
}

export async function applyMoveRequestCompletion(
  requestId: string | number,
  input: MoveRequestCompletionActionInput,
) {
  return requestJson<MoveRequestDto>(
    `/api/moverequests/${normalizeMoveRequestId(requestId)}/completion`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}
