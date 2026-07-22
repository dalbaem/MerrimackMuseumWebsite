import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  clearModuleMocks,
  createJsonRequest,
  createRouteRequest,
  createSpy,
  importFreshProjectModule,
  readJsonResponse,
  routeParams,
} from "../runtime/test-helpers.mjs";
import { setModuleMock } from "../runtime/test-helpers.mjs";

const sampleMoveRequest = {
  id: 11,
  user: {
    email: "faculty@example.com",
  },
  artwork: {
    id: 7,
    title: "River Study",
    dateCreatedMonth: 5,
    dateCreatedYear: 1998,
    comments: "On loan",
    width: "12",
    height: "16",
    size: "12x16",
    artistName: "A. Artist",
    donorName: "D. Donor",
    locationName: "Reading Room",
    categoryName: "Painting",
    imagePath: "uploads/river-study.jpg",
  },
  fromLocation: "Reading Room",
  toLocation: "Gallery Hall",
  status: "pending",
  isPending: true,
  isApproved: false,
  isComplete: false,
  requestNotes: "Please move after finals.",
  requestedAt: "2026-04-20T09:00:00.000Z",
};
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });
}

beforeEach(() => {
  clearModuleMocks();
});

test("move request list rejects mixed state and email filters", async () => {
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      ensureActorMatchesEmail: () => false,
      getRequestActor: async () => null,
      requireRole: async () => ({
        actor: null,
        response: jsonResponse({ error: "Forbidden" }, 403),
      }),
    },
  });
  setModuleMock("@/server/moveRequests/service", {
    namedExports: {
      createMuseumMoveRequest: async () => sampleMoveRequest,
      getApprovedMoveRequests: async () => [],
      getPendingMoveRequests: async () => [],
      getRequestsForArtwork: async () => [],
      getRequestsForUser: async () => [],
    },
  });

  const { GET } = await importFreshProjectModule("app/api/moverequests/route.ts");

  const response = await GET(
    createRouteRequest(
      "http://localhost/api/moverequests?state=pending&email=faculty%40example.com",
    ),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await readJsonResponse(response), {
    error: "Provide exactly one move request filter: state, email, or artworkId.",
  });
});

test("move request list requires authentication for email-scoped queries", async () => {
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      ensureActorMatchesEmail: () => false,
      getRequestActor: async () => null,
      requireRole: async () => ({
        actor: null,
        response: jsonResponse({ error: "Forbidden" }, 403),
      }),
    },
  });
  setModuleMock("@/server/moveRequests/service", {
    namedExports: {
      createMuseumMoveRequest: async () => sampleMoveRequest,
      getApprovedMoveRequests: async () => [],
      getPendingMoveRequests: async () => [],
      getRequestsForArtwork: async () => [],
      getRequestsForUser: async () => [],
    },
  });

  const { GET } = await importFreshProjectModule("app/api/moverequests/route.ts");

  const response = await GET(
    createRouteRequest("http://localhost/api/moverequests?email=faculty%40example.com"),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await readJsonResponse(response), {
    error: "Authentication required",
  });
});

test("move request list allows self-service email queries", async () => {
  const getRequestsForUser = createSpy(async () => [sampleMoveRequest]);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      ensureActorMatchesEmail: (actor, email) => actor.email === email,
      getRequestActor: async () => ({
        email: "faculty@example.com",
        role: "faculty",
      }),
      requireRole: async () => ({
        actor: null,
        response: jsonResponse({ error: "Forbidden" }, 403),
      }),
    },
  });
  setModuleMock("@/server/moveRequests/service", {
    namedExports: {
      createMuseumMoveRequest: async () => sampleMoveRequest,
      getApprovedMoveRequests: async () => [sampleMoveRequest],
      getPendingMoveRequests: async () => [sampleMoveRequest],
      getRequestsForArtwork: async () => [],
      getRequestsForUser,
    },
  });

  const { GET } = await importFreshProjectModule("app/api/moverequests/route.ts");

  const response = await GET(
    createRouteRequest("http://localhost/api/moverequests?email=Faculty%40Example.com"),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(getRequestsForUser.calls, [["faculty@example.com"]]);
  assert.deepEqual(await readJsonResponse(response), [sampleMoveRequest]);
});

test("move request list allows admins to query artwork history", async () => {
  const getRequestsForArtwork = createSpy(async () => [sampleMoveRequest]);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      ensureActorMatchesEmail: () => false,
      getRequestActor: async () => null,
      requireRole: async () => ({
        actor: {
          email: "admin@example.com",
          role: "admin",
        },
        response: null,
      }),
    },
  });
  setModuleMock("@/server/moveRequests/service", {
    namedExports: {
      createMuseumMoveRequest: async () => sampleMoveRequest,
      getApprovedMoveRequests: async () => [],
      getPendingMoveRequests: async () => [],
      getRequestsForArtwork,
      getRequestsForUser: async () => [],
    },
  });

  const { GET } = await importFreshProjectModule("app/api/moverequests/route.ts");

  const response = await GET(
    createRouteRequest("http://localhost/api/moverequests?artworkId=7"),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(getRequestsForArtwork.calls, [[7]]);
  assert.deepEqual(await readJsonResponse(response), [sampleMoveRequest]);
});

test("move request creation forbids faculty requests for other users", async () => {
  const createMuseumMoveRequest = createSpy(async () => sampleMoveRequest);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      ensureActorMatchesEmail: (actor, email) => actor.email === email,
      getRequestActor: async () => ({
        email: "faculty@example.com",
        role: "faculty",
      }),
      requireRole: async () => ({
        actor: null,
        response: jsonResponse({ error: "Forbidden" }, 403),
      }),
    },
  });
  setModuleMock("@/server/moveRequests/service", {
    namedExports: {
      createMuseumMoveRequest,
      getApprovedMoveRequests: async () => [],
      getPendingMoveRequests: async () => [],
      getRequestsForArtwork: async () => [],
      getRequestsForUser: async () => [],
    },
  });

  const { POST } = await importFreshProjectModule("app/api/moverequests/route.ts");

  const response = await POST(
    createJsonRequest("http://localhost/api/moverequests", {
      artworkId: 7,
      email: "other@example.com",
      requestNotes: "Please move after finals.",
      requestedAt: "2026-04-20T09:00:00.000Z",
      toLocation: "Gallery Hall",
    }),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await readJsonResponse(response), {
    error: "Forbidden",
  });
  assert.equal(createMuseumMoveRequest.calls.length, 0);
});

test("move request creation allows admins and forwards normalized input", async () => {
  const createMuseumMoveRequest = createSpy(async () => sampleMoveRequest);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      ensureActorMatchesEmail: () => false,
      getRequestActor: async () => ({
        email: "admin@example.com",
        role: "admin",
      }),
      requireRole: async () => ({
        actor: null,
        response: jsonResponse({ error: "Forbidden" }, 403),
      }),
    },
  });
  setModuleMock("@/server/moveRequests/service", {
    namedExports: {
      createMuseumMoveRequest,
      getApprovedMoveRequests: async () => [],
      getPendingMoveRequests: async () => [],
      getRequestsForArtwork: async () => [],
      getRequestsForUser: async () => [],
    },
  });

  const { POST } = await importFreshProjectModule("app/api/moverequests/route.ts");

  const response = await POST(
    createJsonRequest("http://localhost/api/moverequests", {
      artworkId: "7",
      email: " Faculty@Example.com ",
      requestNotes: "Please move after finals.",
      requestedAt: "2026-04-20T09:00:00.000Z",
      toLocation: " Academic Building 214 ",
    }),
  );

  assert.equal(response.status, 201);
  assert.deepEqual(createMuseumMoveRequest.calls, [
    [
      {
        artworkId: 7,
        email: "faculty@example.com",
        requestNotes: "Please move after finals.",
        requestedAt: "2026-04-20T09:00:00.000Z",
        toLocation: "Academic Building 214",
      },
    ],
  ]);
  assert.deepEqual(await readJsonResponse(response), {
    message: "Request saved successfully",
  });
});

test("move request creation allows requests without a destination", async () => {
  const createMuseumMoveRequest = createSpy(async () => sampleMoveRequest);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      ensureActorMatchesEmail: () => false,
      getRequestActor: async () => ({
        email: "admin@example.com",
        role: "admin",
      }),
      requireRole: async () => ({
        actor: null,
        response: jsonResponse({ error: "Forbidden" }, 403),
      }),
    },
  });
  setModuleMock("@/server/moveRequests/service", {
    namedExports: {
      createMuseumMoveRequest,
      getApprovedMoveRequests: async () => [],
      getPendingMoveRequests: async () => [],
      getRequestsForArtwork: async () => [],
      getRequestsForUser: async () => [],
    },
  });

  const { POST } = await importFreshProjectModule("app/api/moverequests/route.ts");

  const response = await POST(
    createJsonRequest("http://localhost/api/moverequests", {
      artworkId: 7,
      email: "faculty@example.com",
      requestNotes: "Please move after finals.",
      requestedAt: "2026-04-20T09:00:00.000Z",
    }),
  );

  assert.equal(response.status, 201);
  assert.deepEqual(createMuseumMoveRequest.calls, [
    [
      {
        artworkId: 7,
        email: "faculty@example.com",
        requestNotes: "Please move after finals.",
        requestedAt: "2026-04-20T09:00:00.000Z",
        toLocation: null,
      },
    ],
  ]);
  assert.deepEqual(await readJsonResponse(response), {
    message: "Request saved successfully",
  });
});

test("move request detail delete requires authentication", async () => {
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      getRequestActor: async () => null,
      requireRole: async () => ({
        actor: null,
        response: jsonResponse({ error: "Forbidden" }, 403),
      }),
    },
  });
  setModuleMock("@/server/moveRequests/service", {
    namedExports: {
      deletePendingMoveRequest: async () => undefined,
      editPendingMoveRequest: async () => sampleMoveRequest,
      getMoveRequestByIdOrThrow: async () => sampleMoveRequest,
    },
  });

  const { DELETE } = await importFreshProjectModule(
    "app/api/moverequests/[id]/route.ts",
  );

  const response = await DELETE(
    createRouteRequest("http://localhost/api/moverequests/11"),
    routeParams({ id: "11" }),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await readJsonResponse(response), {
    error: "Authentication required",
  });
});

test("move request detail get returns a presented request for admins", async () => {
  const getMoveRequestByIdOrThrow = createSpy(async () => ({
    ...sampleMoveRequest,
    user: {
      email: "faculty@example.com",
      id: 4,
      role: "faculty",
    },
    artwork: {
      ...sampleMoveRequest.artwork,
      id: 7,
    },
  }));
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      getRequestActor: async () => ({
        email: "admin@example.com",
        role: "admin",
      }),
      requireRole: async () => ({
        actor: {
          email: "admin@example.com",
          role: "admin",
        },
        response: null,
      }),
    },
  });
  setModuleMock("@/server/moveRequests/service", {
    namedExports: {
      deletePendingMoveRequest: async () => undefined,
      editPendingMoveRequest: async () => sampleMoveRequest,
      getMoveRequestByIdOrThrow,
    },
  });

  const { GET } = await importFreshProjectModule(
    "app/api/moverequests/[id]/route.ts",
  );

  const response = await GET(
    createRouteRequest("http://localhost/api/moverequests/11"),
    routeParams({ id: "11" }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(getMoveRequestByIdOrThrow.calls, [[11]]);
  assert.deepEqual(await readJsonResponse(response), sampleMoveRequest);
});

test("move request approval route validates and forwards the request action", async () => {
  const reviewMoveRequest = createSpy(async () => sampleMoveRequest);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      requireRole: async () => ({
        actor: {
          email: "admin@example.com",
          role: "admin",
        },
        response: null,
      }),
    },
  });
  setModuleMock("@/server/moveRequests/service", {
    namedExports: {
      reviewMoveRequest,
    },
  });

  const { PUT } = await importFreshProjectModule(
    "app/api/moverequests/[id]/approval/route.ts",
  );

  const response = await PUT(
    createJsonRequest("http://localhost/api/moverequests/11/approval", {
      approvalStatus: "approve",
    }),
    routeParams({ id: "11" }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(reviewMoveRequest.calls, [[11, "approve"]]);
  assert.deepEqual(await readJsonResponse(response), sampleMoveRequest);
});

test("move request completion route validates and forwards completion payloads", async () => {
  const updateMoveProgress = createSpy(async () => sampleMoveRequest);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      requireRole: async () => ({
        actor: {
          email: "admin@example.com",
          role: "admin",
        },
        response: null,
      }),
    },
  });
  setModuleMock("@/server/moveRequests/service", {
    namedExports: {
      updateMoveProgress,
    },
  });

  const { PUT } = await importFreshProjectModule(
    "app/api/moverequests/[id]/completion/route.ts",
  );

  const response = await PUT(
    createJsonRequest("http://localhost/api/moverequests/11/completion", {
      artworkId: "7",
      completionStatus: "complete",
      toLocation: " Gallery Hall ",
    }),
    routeParams({ id: "11" }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(updateMoveProgress.calls, [
    [11, "complete", 7, "Gallery Hall"],
  ]);
  assert.deepEqual(await readJsonResponse(response), sampleMoveRequest);
});
